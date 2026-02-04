# 应用工厂与蓝图模块化

本文讲解 Flask 应用工厂模式和蓝图的最佳实践。

## 为什么需要应用工厂？

传统方式在模块级别创建 app，会导致：
- 测试困难（无法创建多个实例）
- 配置固定（无法动态切换）
- 循环导入问题

## 应用工厂模式

```python
# bluelog/__init__.py
from flask import Flask
from bluelog.extensions import db, login_manager, csrf, mail
from bluelog.settings import config

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_CONFIG', 'development')

    app = Flask('bluelog')
    app.config.from_object(config[config_name])

    # 注册各种组件
    register_extensions(app)
    register_blueprints(app)
    register_commands(app)
    register_errors(app)
    register_template_context(app)

    return app
```

### 注册扩展

将扩展实例化和初始化分开：

```python
# extensions.py - 实例化
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf import CSRFProtect
from flask_migrate import Migrate

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()
migrate = Migrate()

# __init__.py - 初始化
def register_extensions(app):
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    migrate.init_app(app, db)
```

### 注册蓝图

```python
def register_blueprints(app):
    from bluelog.blueprints.blog import blog_bp
    from bluelog.blueprints.admin import admin_bp
    from bluelog.blueprints.auth import auth_bp

    app.register_blueprint(blog_bp)
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(auth_bp, url_prefix='/auth')
```

### 注册错误处理

```python
def register_errors(app):
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('errors/500.html'), 500

    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        return render_template('errors/400.html'), 400
```

### 注册模板上下文

```python
def register_template_context(app):
    @app.context_processor
    def make_template_context():
        admin = Admin.query.first()
        categories = Category.query.order_by(Category.name).all()
        return dict(admin=admin, categories=categories)
```

### 注册 CLI 命令

```python
def register_commands(app):
    @app.cli.command()
    @click.option('--drop', is_flag=True, help='删除后重建')
    def initdb(drop):
        """初始化数据库"""
        if drop:
            db.drop_all()
        db.create_all()
        click.echo('数据库初始化完成')

    @app.cli.command()
    @click.option('--username', prompt=True)
    @click.option('--password', prompt=True, hide_input=True)
    def init(username, password):
        """初始化管理员"""
        db.create_all()
        admin = Admin(username=username)
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
```

## 蓝图 (Blueprint)

蓝图是组织路由和视图的方式：

```python
# blueprints/blog.py
from flask import Blueprint, render_template

blog_bp = Blueprint('blog', __name__)

@blog_bp.route('/')
def index():
    posts = Post.query.order_by(Post.timestamp.desc()).all()
    return render_template('blog/index.html', posts=posts)

@blog_bp.route('/post/<int:post_id>')
def show_post(post_id):
    post = Post.query.get_or_404(post_id)
    return render_template('blog/post.html', post=post)
```

```python
# blueprints/auth.py
from flask import Blueprint, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        admin = Admin.query.filter_by(username=form.username.data).first()
        if admin and admin.validate_password(form.password.data):
            login_user(admin)
            return redirect(url_for('blog.index'))
        flash('用户名或密码错误')
    return render_template('auth/login.html', form=form)

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('blog.index'))
```

```python
# blueprints/admin.py
from flask import Blueprint
from flask_login import login_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/post/new', methods=['GET', 'POST'])
@login_required
def new_post():
    form = PostForm()
    if form.validate_on_submit():
        post = Post(
            title=form.title.data,
            body=form.body.data,
            category_id=form.category.data
        )
        db.session.add(post)
        db.session.commit()
        return redirect(url_for('blog.show_post', post_id=post.id))
    return render_template('admin/new_post.html', form=form)
```

## 蓝图的好处

1. **模块化** - 按功能拆分代码
2. **可复用** - 蓝图可以在多个应用中使用
3. **URL 前缀** - 统一管理路由前缀
4. **静态文件/模板** - 每个蓝图可以有自己的资源

## 日志处理

```python
def register_logging(app):
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )

    file_handler = RotatingFileHandler(
        'logs/bluelog.log',
        maxBytes=10 * 1024 * 1024,
        backupCount=10
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    if not app.debug:
        app.logger.addHandler(file_handler)
```

## 运行应用

```bash
# 设置环境变量
export FLASK_APP=bluelog
export FLASK_ENV=development

# 初始化数据库
flask initdb

# 创建管理员
flask init

# 运行开发服务器
flask run
```

## 总结

应用工厂模式的核心优势：

- 延迟创建应用实例
- 支持多配置切换
- 便于测试
- 避免循环导入

蓝图的核心优势：

- 代码模块化
- 路由分组管理
- 可复用组件
