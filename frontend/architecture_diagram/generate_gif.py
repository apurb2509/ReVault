import os
from PIL import Image, ImageDraw, ImageFont

def create_gif():
    # Setup dimensions and colors
    width, height = 800, 600
    bg_color = (15, 23, 42) # Dark blue/gray (Tailwind slate-900)
    box_color = (30, 41, 59) # slate-800
    text_color = (248, 250, 252) # slate-50
    active_color = (56, 189, 248) # sky-400
    arrow_color = (100, 116, 139) # slate-500
    
    # Try to load a font, otherwise use default
    try:
        font = ImageFont.truetype("arial.ttf", 16)
        title_font = ImageFont.truetype("arialbd.ttf", 24)
        small_font = ImageFont.truetype("arial.ttf", 12)
    except IOError:
        font = ImageFont.load_default()
        title_font = font
        small_font = font

    # Define nodes and their positions (center x, center y)
    nodes = {
        "Razorpay": (100, 150),
        "API Gateway": (100, 300),
        "Kafka": (300, 300),
        "FastAPI": (500, 300),
        "AI Agents": (500, 150),
        "Supabase DB": (700, 150),
        "React UI": (700, 300)
    }

    # Sequence of steps: (from_node, to_node, description)
    steps = [
        ("Razorpay", "API Gateway", "1. Webhook (Payment Failed)"),
        ("API Gateway", "Kafka", "2. Publish Event"),
        ("Kafka", "FastAPI", "3. Consume Event"),
        ("FastAPI", "AI Agents", "4. Trigger Agent Graph"),
        ("AI Agents", "AI Agents", "5. LLM Root Cause Analysis"),
        ("AI Agents", "Supabase DB", "6. Check Compliance Rules"),
        ("Supabase DB", "AI Agents", "7. Rule Approved"),
        ("AI Agents", "Razorpay", "8. Execute Recovery"),
        ("AI Agents", "Supabase DB", "9. Log Action"),
        ("Supabase DB", "React UI", "10. Real-Time Dashboard Update")
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

    # Generate an idle frame
    def create_base_frame(active_step=None):
        img = Image.new('RGB', (width, height), bg_color)
        draw = ImageDraw.Draw(img)
        
        # Draw Title
        title_text = "ReVault Architecture & Real-Time Data Flow"
        draw.text((width//2, 40), title_text, fill=text_color, font=title_font, anchor="ms")
        
        # Draw static connections first
        for name, (cx, cy) in nodes.items():
            pass # We could draw all arrows faintly, but let's just highlight the active one
            
        # Draw nodes
        box_w, box_h = 130, 60
        for name, (cx, cy) in nodes.items():
            x1, y1 = cx - box_w//2, cy - box_h//2
            x2, y2 = cx + box_w//2, cy + box_h//2
            
            is_active = False
            if active_step is not None:
                if name == steps[active_step][0] or name == steps[active_step][1]:
                    is_active = True
                    
            fill = box_color
            outline = active_color if is_active else arrow_color
            out_w = 3 if is_active else 1
            
            draw_rounded_rect(draw, (x1, y1, x2, y2), 10, fill, outline, width=out_w)
            draw.text((cx, cy), name, fill=text_color, font=font, anchor="mm")
            
        # Draw active step arrow and text
        if active_step is not None:
            n1, n2, desc = steps[active_step]
            
            # Step description at bottom
            draw.text((width//2, 520), f"Current Event: {desc}", fill=active_color, font=title_font, anchor="ms")
            
            x1, y1 = nodes[n1]
            x2, y2 = nodes[n2]
            
            if n1 == n2:
                # self loop
                draw.arc([x1-box_w//2, y1-box_h-20, x1+box_w//2, y1], 180, 0, fill=active_color, width=3)
            else:
                # Draw arrow from box border, not center
                # simple math to offset from center by box_w/2 or box_h/2
                dx = x2 - x1
                dy = y2 - y1
                import math
                dist = math.hypot(dx, dy)
                if dist > 0:
                    ux, uy = dx/dist, dy/dist
                    # Approx boundary
                    px1 = x1 + ux * (box_w//2)
                    py1 = y1 + uy * (box_h//2)
                    px2 = x2 - ux * (box_w//2 + 10)
                    py2 = y2 - uy * (box_h//2 + 10)
                    
                    draw.line([px1, py1, px2, py2], fill=active_color, width=3)
                    
                    # Arrow head
                    arrow_len = 15
                    angle = math.atan2(dy, dx)
                    p_left = (px2 - arrow_len * math.cos(angle - 0.5), py2 - arrow_len * math.sin(angle - 0.5))
                    p_right = (px2 - arrow_len * math.cos(angle + 0.5), py2 - arrow_len * math.sin(angle + 0.5))
                    draw.polygon([px2, py2, p_left[0], p_left[1], p_right[0], p_right[1]], fill=active_color)
            
        return img

    # Start frames
    frames.append(create_base_frame())
    frames.append(create_base_frame())
    
    for i in range(len(steps)):
        frame = create_base_frame(i)
        # Duplicate frame for hold time
        for _ in range(8):  # 800ms per step
            frames.append(frame)
            
    # Hold last frame
    for _ in range(10):
        frames.append(frames[-1])

    frames[0].save('architecture.gif', save_all=True, append_images=frames[1:], optimize=False, duration=150, loop=0)
    print("GIF created successfully at architecture.gif")

if __name__ == "__main__":
    create_gif()
