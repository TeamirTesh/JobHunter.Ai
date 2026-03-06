"""add company_domain to applications

Revision ID: a1b2c3d4e5f6
Revises: dbe12c666323
Create Date: 2026-03-05

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = 'dbe12c666323'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('applications', sa.Column('company_domain', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('applications', 'company_domain')
