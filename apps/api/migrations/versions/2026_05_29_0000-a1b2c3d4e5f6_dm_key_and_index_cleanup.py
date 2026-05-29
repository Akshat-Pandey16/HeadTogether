
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "bac76b6d6d90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("rooms", schema=None) as batch_op:
        batch_op.add_column(sa.Column("dm_key", sa.String(length=73), nullable=True))
        batch_op.create_index("ix_rooms_dm_key", ["dm_key"], unique=True)
        batch_op.drop_index("ix_rooms_owner_id")


def downgrade() -> None:
    with op.batch_alter_table("rooms", schema=None) as batch_op:
        batch_op.create_index("ix_rooms_owner_id", ["owner_id"], unique=False)
        batch_op.drop_index("ix_rooms_dm_key")
        batch_op.drop_column("dm_key")
