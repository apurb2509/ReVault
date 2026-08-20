from datetime import date


def predict_salary_day(transaction_dates: list[date]) -> int | None:
    """
    Infers the most likely salary credit day from a customer's historical
    payment dates. Returns the day-of-month (1–31) or None if no pattern found.

    The approach is deliberately simple: salary-day payments cluster within
    a narrow window, so we look for the dominant day-of-month across history.
    A more sophisticated model (e.g. Gaussian mixture) is not warranted here
    because we're reasoning about human payday patterns, which are almost always
    simple (1st, 5th, 15th, 25th, 28th, etc.).
    """
    if not transaction_dates:
        return None

    # Tally day-of-month occurrences
    day_counts: dict[int, int] = {}
    for d in transaction_dates:
        day_counts[d.day] = day_counts.get(d.day, 0) + 1

    if not day_counts:
        return None

    most_common_day = max(day_counts, key=lambda d: day_counts[d])
    occurrences = day_counts[most_common_day]

    # Only treat it as a pattern if the day appears in at least 40% of months
    if occurrences / len(transaction_dates) < 0.4:
        return None

    return most_common_day


def next_salary_date(transaction_dates: list[date]) -> date | None:
    """
    Returns the next expected salary credit date based on historical patterns.
    Falls back to the 1st of next month if no pattern is detected.
    """
    salary_day = predict_salary_day(transaction_dates)
    today = date.today()

    if salary_day is None:
        # Default to 1st of next month when no pattern is clear
        if today.month == 12:
            return date(today.year + 1, 1, 1)
        return date(today.year, today.month + 1, 1)

    # Next occurrence of salary_day
    if today.day < salary_day:
        try:
            return date(today.year, today.month, salary_day)
        except ValueError:
            # salary_day doesn't exist in this month (e.g. 31st in April)
            pass

    if today.month == 12:
        return date(today.year + 1, 1, min(salary_day, 28))
    try:
        return date(today.year, today.month + 1, salary_day)
    except ValueError:
        return date(today.year, today.month + 1, 28)
