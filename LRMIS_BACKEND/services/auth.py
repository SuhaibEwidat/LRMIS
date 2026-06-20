from datetime import datetime, timedelta
from fastapi import HTTPException
from passlib.context import CryptContext
from jose import jwt

from repositories import auth


SECRET_KEY = "lrmis_secret_key_change_later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    if not hashed_password:
        return False

    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def register_service(data: dict):
    """
    Register user account.

    If account_type = applicant:
        create applicant profile + user account

    If account_type = staff:
        create staff profile + user account
    """

    email = data.get("email")
    password = data.get("password")
    account_type = data.get("account_type")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    if not account_type:
        raise HTTPException(status_code=400, detail="account_type is required")

    if account_type not in ["applicant", "staff"]:
        raise HTTPException(
            status_code=400,
            detail="account_type must be applicant or staff"
        )

    existing_user = auth.get_user_by_email(email)

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already exists in the system"
        )

    password_hash = hash_password(password)

    if account_type == "applicant":
        return register_applicant(data, email, password_hash)

    return register_staff(data, email, password_hash)


def register_applicant(data: dict, email: str, password_hash: str):
    full_name = data.get("full_name")
    applicant_type = data.get("applicant_type")

    identity = data.get("identity", {})
    contacts = data.get("contacts", {})
    address = data.get("address", {})
    preferences = data.get("preferences", {})
    privacy_settings = data.get("privacy_settings", {})

    national_id = identity.get("national_id")

    if not full_name:
        raise HTTPException(status_code=400, detail="full_name is required")

    if not applicant_type:
        raise HTTPException(status_code=400, detail="applicant_type is required")

    if applicant_type not in [
        "citizen",
        "lawyer",
        "company",
        "surveyor",
        "authorized_representative"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid applicant_type"
        )

    if not national_id:
        raise HTTPException(status_code=400, detail="national_id is required")

    existing_national_id = auth.get_applicant_by_national_id(national_id)

    if existing_national_id:
        raise HTTPException(
            status_code=409,
            detail="National ID already exists"
        )

    applicant_data = {
        "user_id": None,

        "full_name": full_name,
        "applicant_type": applicant_type,
        "verification_state": "unverified",

        "identity": {
            "national_id": national_id,
            "registration_number": identity.get("registration_number"),
            "verified": False,
            "verification_method": None,
            "verified_at": None
        },

        "contacts": {
            "email": email,
            "phone": contacts.get("phone")
        },

        "address": {
            "city": address.get("city"),
            "neighborhood": address.get("neighborhood"),
            "street": address.get("street"),
            "zone_id": address.get("zone_id")
        },

        "preferences": {
            "language": preferences.get("language", "ar"),
            "preferred_contact": preferences.get("preferred_contact", "email"),
            "notifications": {
                "email": preferences.get("notifications", {}).get("email", True),
                "sms": preferences.get("notifications", {}).get("sms", False),
                "on_status_change": preferences.get("notifications", {}).get(
                    "on_status_change", True
                ),
                "on_missing_documents": preferences.get("notifications", {}).get(
                    "on_missing_documents", True
                ),
                "on_certificate_ready": preferences.get("notifications", {}).get(
                    "on_certificate_ready", True
                )
            }
        },

        "linked_applications": [],

        "privacy_settings": {
            "show_contact_to_staff": privacy_settings.get(
                "show_contact_to_staff", True
            )
        },

        "stats": {
            "total_applications": 0,
            "approved_applications": 0,
            "pending_applications": 0
        }
    }

    created_applicant = auth.create_applicant(applicant_data)

    user_data = {
        "email": email,
        "password_hash": password_hash,
        "account_type": "applicant",
        "profile_id": created_applicant["_id"]
    }

    created_user = auth.create_user(user_data)

    updated_applicant = auth.update_applicant_user_id(
        applicant_id=created_applicant["_id"],
        user_id=created_user["_id"]
    )

    created_user.pop("password_hash", None)

    return {
        "message": "Applicant registered successfully",
        "user": created_user,
        "profile": updated_applicant
    }


def register_staff(data: dict, email: str, password_hash: str):
    staff_code = data.get("staff_code")
    name = data.get("name")
    role = data.get("role")

    if not staff_code:
        raise HTTPException(status_code=400, detail="staff_code is required")

    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    if not role:
        raise HTTPException(status_code=400, detail="role is required")

    if role not in ["surveyor", "registrar"]:
        raise HTTPException(
            status_code=400,
            detail="role must be surveyor or registrar"
        )

    existing_staff = auth.get_staff_by_code(staff_code)

    if existing_staff:
        raise HTTPException(
            status_code=409,
            detail="Staff code already exists"
        )

    contacts = data.get("contacts", {})
    coverage = data.get("coverage", {})
    workload = data.get("workload", {})

    staff_data = {
        "user_id": None,

        "staff_code": staff_code,
        "name": name,
        "role": role,
        "department": data.get("department"),

        "skills": data.get("skills", []),

        "coverage": {
            "zone_ids": coverage.get("zone_ids", [])
        },

        "workload": {
            "active_tasks": workload.get("active_tasks", 0),
            "max_tasks": workload.get("max_tasks", 10)
        },

        "contacts": {
            "email": email,
            "phone": contacts.get("phone")
        },

        "active": data.get("active", True)
    }

    created_staff = auth.create_staff(staff_data)

    user_data = {
        "email": email,
        "password_hash": password_hash,
        "account_type": "staff",
        "profile_id": created_staff["_id"]
    }

    created_user = auth.create_user(user_data)

    updated_staff = auth.update_staff_user_id(
        staff_id=created_staff["_id"],
        user_id=created_user["_id"]
    )

    created_user.pop("password_hash", None)

    return {
        "message": "Staff registered successfully",
        "user": created_user,
        "profile": updated_staff
    }


def login_service(data: dict):
    email = data.get("email")
    password = data.get("password")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    user = auth.get_user_by_email(email)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_is_valid = verify_password(
        password,
        user.get("password_hash", "")
    )

    if not password_is_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    account_type = user.get("account_type")
    profile_id = user.get("profile_id")

    if account_type == "applicant":
        profile = auth.get_applicant_by_id(profile_id)
    elif account_type == "staff":
        profile = auth.get_staff_by_id(profile_id)
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid account type"
        )

    token = create_access_token({
        "user_id": user["_id"],
        "account_type": account_type,
        "profile_id": profile_id,
        "email": email
    })

    user.pop("password_hash", None)

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "account_type": account_type,
        "user": user,
        "profile": profile
    }