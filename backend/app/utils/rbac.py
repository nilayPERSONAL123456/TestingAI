"""Role-Based Access Control utilities"""
from fastapi import Depends, HTTPException
from app.models.user import User
from app.utils.auth import get_current_user


def require_role(*allowed_roles):
    """Dependency that checks if user has one of the allowed roles"""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"Access denied. Required role: {', '.join(allowed_roles)}")
        return current_user
    return role_checker


def require_owner_or_partner(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["owner", "partner"]:
        raise HTTPException(status_code=403, detail="Only owners and partners can perform this action")
    return current_user


def require_manager_or_above(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["owner", "partner", "manager"]:
        raise HTTPException(status_code=403, detail="Manager or above role required")
    return current_user
