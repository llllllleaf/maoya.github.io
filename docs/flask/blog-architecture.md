---
description: Flask 博客系统完整架构设计，涵盖数据模型 ER 图、用户认证、CRUD、评论和邮件通知
---

# Flask博客系统架构设计

本文讲解一个完整 Flask 博客系统的架构设计。

## 数据模型设计

### ER 图

```
Admin (管理员)
  ├── username
  ├── password_hash
  └── blog_title

Category (分类)
  ├── name
  └── posts (1:N)

Post (文章)
  ├── title
  ├── body
  ├── timestamp
  ├── category_id (FK)
  └── comments (1:N)

Comment (评论)
  ├── author
  ├── body
  ├── post_id (FK)
  └── replied_id (FK → self)  # 支持回复
```

### 模型代码

```python
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from bluelog.extensions import db

class Admin(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20))
    password_hash = db.Column(db.String(128))
    blog_title = db.Column(db.String(60))
    blog_sub_title = db.Column(db.String(100))
    name = db.Column(db.String(30))
    about = db.Column(db.Text)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def validate_password(self, password):
        return check_password_hash(self.password_hash, password)


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(30), unique=True)
    posts = db.relationship('Post', back_populates='category')

    def delete(self):
        # 删除分类时，将文章移到默认分类
        default_category = Category.query.get(1)
        for post in self.posts:
            post.category = default_category
        db.session.delete(self)
        db.session.commit()


class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(60))
    body = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    can_comment = db.Column(db.Boolean, default=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))

    category = db.relationship('Category', back_populates='posts')
    comments = db.relationship('Comment', back_populates='post',
                               cascade='all, delete-orphan')


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    author = db.Column(db.String(30))
    email = db.Column(db.String(254))
    body = db.Column(db.Text)
    reviewed = db.Column(db.Boolean, default=False)  # 审核状态
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # 自引用关系，支持评论回复
    replied_id = db.Column(db.Integer, db.ForeignKey('comment.id'))
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'))

    post = db.relationship('Post', back_populates='comments')
    replies = db.relationship('Comment', back_populates='replied',
                              cascade='all, delete-orphan')
    replied = db.relationship('Comment', back_populates='replies',
                              remote_side=[id])
```

## 功能模块划分

| 模块 | 功能 | 蓝图 |
|------|------|------|
| 博客前台 | 文章列表、详情、评论 | blog_bp |
| 用户认证 | 登录、登出 | auth_bp |
| 后台管理 | 文章/分类/评论管理 | admin_bp |

## 路由设计

### 博客前台 (blog_bp)

```python
@blog_bp.route('/')
def index():
    # 文章列表，分页
    pass

@blog_bp.route('/post/<int:post_id>')
def show_post(post_id):
    # 文章详情
    pass

@blog_bp.route('/category/<int:category_id>')
def show_category(category_id):
    # 分类文章列表
    pass
```

### 用户认证 (auth_bp)

```python
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    pass

@auth_bp.route('/logout')
@login_required
def logout():
    pass
```

### 后台管理 (admin_bp)

```python
@admin_bp.route('/post/new', methods=['GET', 'POST'])
@login_required
def new_post():
    pass

@admin_bp.route('/post/<int:post_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_post(post_id):
    pass

@admin_bp.route('/post/<int:post_id>/delete', methods=['POST'])
@login_required
def delete_post(post_id):
    pass
```

## 表单设计

```python
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, TextAreaField, SubmitField
from wtforms.validators import DataRequired, Length

class LoginForm(FlaskForm):
    username = StringField('用户名', validators=[DataRequired(), Length(1, 20)])
    password = PasswordField('密码', validators=[DataRequired(), Length(1, 128)])
    submit = SubmitField('登录')

class PostForm(FlaskForm):
    title = StringField('标题', validators=[DataRequired(), Length(1, 60)])
    body = TextAreaField('正文', validators=[DataRequired()])
    category = SelectField('分类', coerce=int)
    submit = SubmitField('发布')

class CommentForm(FlaskForm):
    author = StringField('昵称', validators=[DataRequired(), Length(1, 30)])
    email = StringField('邮箱', validators=[DataRequired(), Email()])
    body = TextAreaField('评论', validators=[DataRequired()])
    submit = SubmitField('提交')
```

## 配置管理

```python
# settings.py
import os

class BaseConfig:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///dev.db'

class ProductionConfig(BaseConfig):
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig
}
```

