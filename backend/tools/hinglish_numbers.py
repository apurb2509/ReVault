def to_hinglish(amount: int) -> str:
    ones = {
        0: "shunya", 1: "ek", 2: "do", 3: "teen", 4: "chaar", 5: "paanch", 6: "chhah", 7: "saat", 8: "aath", 9: "nau",
        10: "das", 11: "gyaarah", 12: "baarah", 13: "terah", 14: "chaudah", 15: "pandrah", 16: "solah", 17: "satrah", 18: "atharah", 19: "unnees",
        20: "bees", 21: "ikkees", 22: "baais", 23: "teis", 24: "chaubees", 25: "pachees", 26: "chhabbees", 27: "sattais", 28: "atthaais", 29: "unnatees",
        30: "tees", 31: "ikattees", 32: "battees", 33: "taintees", 34: "chauntees", 35: "paintees", 36: "chhattees", 37: "saintees", 38: "adtees", 39: "untaalees",
        40: "chaalees", 41: "iktaalees", 42: "byaalees", 43: "taintaalees", 44: "chauvaalees", 45: "paintaalees", 46: "chhiyaalees", 47: "saintaalees", 48: "adtaalees", 49: "unchaas",
        50: "pachaas", 51: "ikyaavan", 52: "baavan", 53: "tirpan", 54: "chauvan", 55: "pachpan", 56: "chhappan", 57: "sattaavan", 58: "atthaavan", 59: "unsath",
        60: "saath", 61: "iksath", 62: "baasath", 63: "tirsath", 64: "chaunsath", 65: "painsath", 66: "chhiyasath", 67: "sarsath", 68: "arsath", 69: "unhattar",
        70: "sattar", 71: "ikhattar", 72: "bahattar", 73: "tihattar", 74: "chauhattar", 75: "pachhattar", 76: "chhihattar", 77: "satahattar", 78: "athahattar", 79: "unasee",
        80: "assee", 81: "ikyasee", 82: "bayasee", 83: "tirasee", 84: "chauraasee", 85: "pachaasee", 86: "chhiyaasee", 87: "sattaasee", 88: "atthaasee", 89: "navaasee",
        90: "nabbe", 91: "ikyaanave", 92: "baanave", 93: "tiraanave", 94: "chauraanave", 95: "pachaanave", 96: "chhiyaanave", 97: "sattaanave", 98: "atthaanave", 99: "ninyaanave"
    }
    if amount == 0:
        return ones[0]
    
    parts = []
    
    crore = amount // 10000000
    if crore > 0:
        parts.append(f"{to_hinglish(crore)} crore")
        amount %= 10000000
        
    lakh = amount // 100000
    if lakh > 0:
        parts.append(f"{ones[lakh]} lakh")
        amount %= 100000
        
    thou = amount // 1000
    if thou > 0:
        parts.append(f"{ones[thou]} hazaar")
        amount %= 1000
        
    hund = amount // 100
    if hund > 0:
        parts.append(f"{ones[hund]} sau")
        amount %= 100
        
    if amount > 0:
        parts.append(ones[amount])
        
    return " ".join(parts)
