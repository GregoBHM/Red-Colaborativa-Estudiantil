from sqlalchemy.orm import Session
from models.user import User

XP_BASE_HELP = 50
XP_PER_STAR = 10


def award_xp_for_help(db: Session, mentor_id: int, stars: int) -> User:
    mentor = db.query(User).filter(User.id == mentor_id).first()
    if not mentor:
        return None

    xp_earned = XP_BASE_HELP + (stars * XP_PER_STAR)
    mentor.xp_points += xp_earned
    mentor.total_helps += 1

    all_ratings_count = mentor.total_helps
    current_avg = mentor.reputation
    mentor.reputation = round(
        ((current_avg * (all_ratings_count - 1)) + stars) / all_ratings_count, 2
    )

    db.commit()
    db.refresh(mentor)
    return mentor
