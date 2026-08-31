import os
import math
from PIL import Image, ImageDraw, ImageFont

def create_gif():
    # Setup dimensions and colors
    width, height = 1550, 850
    bg_color = (15, 23, 42) # slate-900
    box_color = (30, 41, 59) # slate-800
    text_color = (248, 250, 252) # slate-50
    active_color = (56, 189, 248) # sky-400
    arrow_color = (100, 116, 139) # slate-500
    
    # Try to load a font, otherwise use default
    try:
        font = ImageFont.truetype("arial.ttf", 16)
        title_font = ImageFont.truetype("arialbd.ttf", 26)
        desc_font = ImageFont.truetype("arialbd.ttf", 20)
    except IOError:
        font = ImageFont.load_default()
        title_font = font
        desc_font = font

    # Define nodes and their positions (center x, center y)
    nodes = {
        # Sources
        "Razorpay": (150, 250),
        "Customer/App": (150, 450),
        "B2B ERP": (150, 650),
        
        # Ingestion Pipeline
        "API Gateway": (400, 450),
        "Redis Queue": (600, 450),
        "FastAPI Orch.": (800, 450),
        
        # Agents Layer
        "1. Watchdog": (1100, 100),
        "2. Abandonment": (1100, 200),
        "3. Subscription": (1100, 300),
        "4. B2B Pursuit": (1100, 400),
        "5. Mandate Retry": (1100, 500),
        "6. VoiceIQ": (1100, 600),
        "7. PTP Engine": (1100, 700),
        
        # Output / State
        "Compliance Engine": (1350, 250),
        "Supabase DB": (1350, 450),
        "React UI": (1350, 650)
    }

    node_labels = {
        "Razorpay": "Razorpay",
        "Customer/App": "Customer/App",
        "B2B ERP": "B2B ERP",
        "API Gateway": "API Gateway\n(Go / HTTP)",
        "Redis Queue": "Redis Queue\n(aioredis)",
        "FastAPI Orch.": "FastAPI Orch.\n(Python 3.12)",
        "1. Watchdog": "1. Watchdog\n(Gemini 1.5)",
        "2. Abandonment": "2. Abandonment\n(LangGraph)",
        "3. Subscription": "3. Subscription\n(LangGraph)",
        "4. B2B Pursuit": "4. B2B Pursuit\n(LangGraph)",
        "5. Mandate Retry": "5. Mandate Retry\n(LangGraph)",
        "6. VoiceIQ": "6. VoiceIQ\n(ElevenLabs/gTTS)",
        "7. PTP Engine": "7. PTP Engine\n(gpt-4o-mini)",
        "Compliance Engine": "Compliance Engine\n(Rules/Redis)",
        "Supabase DB": "Supabase DB\n(PostgreSQL)",
        "React UI": "React UI\n(React 19 + Redux)"
    }

    # Sequence of steps for all 7 processes
    steps = [
        # Process 1: Degradation
        ("Razorpay", "API Gateway", "P1: Systemic Outage Webhook"),
        ("API Gateway", "Redis Queue", ""),
        ("Redis Queue", "FastAPI Orch.", ""),
        ("FastAPI Orch.", "1. Watchdog", "Trigger Watchdog"),
        ("1. Watchdog", "Supabase DB", "Log Alert"),
        ("Supabase DB", "React UI", "Push Alert to Dashboard"),

        # Process 2: Abandonment
        ("Customer/App", "API Gateway", "P2: Checkout Drop-off Event"),
        ("API Gateway", "Redis Queue", ""),
        ("Redis Queue", "FastAPI Orch.", ""),
        ("FastAPI Orch.", "2. Abandonment", "Trigger Abandonment Hunter"),
        ("2. Abandonment", "Compliance Engine", "Check Contact Rules"),
        ("Compliance Engine", "Customer/App", "Send WhatsApp Link"),

        # Process 3: Subscription
        ("Razorpay", "API Gateway", "P3: Sub Auto-Debit Failed"),
        ("API Gateway", "Redis Queue", ""),
        ("Redis Queue", "FastAPI Orch.", ""),
        ("FastAPI Orch.", "3. Subscription", "Trigger Rescue Agent"),
        ("3. Subscription", "Compliance Engine", "Check Retry Rules"),
        ("Compliance Engine", "Razorpay", "Smart Retry / Update Card"),

        # Process 4: B2B Pursuit
        ("B2B ERP", "API Gateway", "P4: Invoice Overdue Sync"),
        ("API Gateway", "Redis Queue", ""),
        ("Redis Queue", "FastAPI Orch.", ""),
        ("FastAPI Orch.", "4. B2B Pursuit", "Trigger B2B Chaser"),
        ("4. B2B Pursuit", "Supabase DB", "Update Invoice State"),

        # Process 5: Mandate Retry
        ("Razorpay", "API Gateway", "P5: UPI Mandate Failed"),
        ("API Gateway", "Redis Queue", ""),
        ("Redis Queue", "FastAPI Orch.", ""),
        ("FastAPI Orch.", "5. Mandate Retry", "Trigger Sequencer"),
        ("5. Mandate Retry", "Customer/App", "Send Card Link instead"),

        # Process 6: VoiceIQ
        ("FastAPI Orch.", "6. VoiceIQ", "P6: Trigger Voice Call (Escalation)"),
        ("6. VoiceIQ", "Customer/App", "Place Hinglish Call"),

        # Process 7: PTP Engine
        ("Customer/App", "API Gateway", "P7: Customer Replies 'Will pay Friday'"),
        ("API Gateway", "Redis Queue", ""),
        ("Redis Queue", "FastAPI Orch.", ""),
        ("FastAPI Orch.", "7. PTP Engine", "Trigger PTP Extraction"),
        ("7. PTP Engine", "Supabase DB", "Log Promise Date")
    ]

    frames = []
    
    def draw_rounded_rect(draw, coords, radius, fill, outline, width=1):
        x1, y1, x2, y2 = coords
        draw.rectangle([x1+radius, y1, x2-radius, y2], fill=fill, outline=None)
        draw.rectangle([x1, y1+radius, x2, y2-radius], fill=fill, outline=None)
        draw.pieslice([x1, y1, x1+radius*2, y1+radius*2], 180, 270, fill=fill, outline=None)
        draw.pieslice([x2-radius*2, y1, x2, y1+radius*2], 270, 360, fill=fill, outline=None)
        draw.pieslice([x1, y2-radius*2, x1+radius*2, y2], 90, 180, fill=fill, outline=None)
        draw.pieslice([x2-radius*2, y2-radius*2, x2, y2], 0, 90, fill=fill, outline=None)
        
        if outline:
            draw.arc([x1, y1, x1+radius*2, y1+radius*2], 180, 270, fill=outline, width=width)
            draw.arc([x2-radius*2, y1, x2, y1+radius*2], 270, 360, fill=outline, width=width)
            draw.arc([x1, y2-radius*2, x1+radius*2, y2], 90, 180, fill=outline, width=width)
            draw.arc([x2-radius*2, y2-radius*2, x2, y2], 0, 90, fill=outline, width=width)
            draw.line([x1+radius, y1, x2-radius, y1], fill=outline, width=width)
            draw.line([x1+radius, y2, x2-radius, y2], fill=outline, width=width)
            draw.line([x1, y1+radius, x1, y2-radius], fill=outline, width=width)
            draw.line([x2, y1+radius, x2, y2-radius], fill=outline, width=width)

    def create_base_frame(active_step=None):
        img = Image.new('RGB', (width, height), bg_color)
        draw = ImageDraw.Draw(img)
        
        # Draw Title
        title_text = "ReVault Architecture: Complete End-to-End Flow for All 7 Processes"
        draw.text((width//2, 30), title_text, fill=text_color, font=title_font, anchor="ms")
        
        box_w, box_h = 180, 75
        
        activated_nodes = set()
        if active_step is not None:
            for s in range(active_step + 1):
                activated_nodes.add(steps[s][0])
                activated_nodes.add(steps[s][1])
                
        # Draw all arrows up to current step
        drawn_connections = {}  # Keep track of connections to offset multiple lines between same nodes
        if active_step is not None:
            for s in range(active_step + 1):
                n1, n2, desc = steps[s]
                x1, y1 = nodes[n1]
                x2, y2 = nodes[n2]
                
                pair = tuple(sorted([n1, n2]))
                drawn_connections[pair] = drawn_connections.get(pair, 0) + 1
                offset = (drawn_connections[pair] - 1) * 8
                
                is_current = (s == active_step)
                c_color = active_color if is_current else arrow_color
                out_w = 4 if is_current else 2
                
                dx = x2 - x1
                dy = y2 - y1
                dist = math.hypot(dx, dy)
                if dist > 0:
                    ux, uy = dx/dist, dy/dist
                    # Start from edge of box 1, end at edge of box 2
                    px1 = x1 + ux * (box_w//2 + 5) - uy * offset
                    py1 = y1 + uy * (box_h//2 + 5) + ux * offset
                    px2 = x2 - ux * (box_w//2 + 10) - uy * offset
                    py2 = y2 - uy * (box_h//2 + 10) + ux * offset
                    
                    draw.line([px1, py1, px2, py2], fill=c_color, width=out_w)
                    
                    # Arrow head
                    arrow_len = 15
                    angle = math.atan2(dy, dx)
                    p_left = (px2 - arrow_len * math.cos(angle - 0.5), py2 - arrow_len * math.sin(angle - 0.5))
                    p_right = (px2 - arrow_len * math.cos(angle + 0.5), py2 - arrow_len * math.sin(angle + 0.5))
                    draw.polygon([px2, py2, p_left[0], p_left[1], p_right[0], p_right[1]], fill=c_color)

        # Draw nodes on top of arrows
        for name, (cx, cy) in nodes.items():
            x1, y1 = cx - box_w//2, cy - box_h//2
            x2, y2 = cx + box_w//2, cy + box_h//2
            
            is_active = (name in activated_nodes)
            fill = box_color
            outline = active_color if is_active else arrow_color
            out_w = 3 if is_active else 1
            
            draw_rounded_rect(draw, (x1, y1, x2, y2), 10, fill, outline, width=out_w)
            draw.text((cx, cy), node_labels.get(name, name), fill=text_color, font=font, anchor="mm", align="center")
            
        # Draw active step description
        if active_step is not None:
            _, _, desc = steps[active_step]
            if desc:
                draw.text((width//2, 800), f"Current Event: {desc}", fill=active_color, font=desc_font, anchor="ms")
            else:
                # If no desc, just show the previous desc to keep text stable
                # Find last non-empty desc
                last_desc = ""
                for s in range(active_step, -1, -1):
                    if steps[s][2]:
                        last_desc = steps[s][2]
                        break
                draw.text((width//2, 800), f"Current Event: {last_desc}", fill=arrow_color, font=desc_font, anchor="ms")
            
        return img

    # Start frames
    frames.append(create_base_frame())
    frames.append(create_base_frame())
    
    for i in range(len(steps)):
        frame = create_base_frame(i)
        # Hold each frame slightly
        for _ in range(4):  # 4 * 100ms = 400ms per step
            frames.append(frame)
            
    # Hold last frame longer
    for _ in range(30):
        frames.append(frames[-1])

    frames[0].save('architecture.gif', save_all=True, append_images=frames[1:], optimize=False, duration=100, loop=0)
    print("GIF created successfully at architecture.gif")

if __name__ == "__main__":
    create_gif()
