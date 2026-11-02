import os
import re
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def get_sorted_images(folder):
    files = [f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    files.sort(key=natural_sort_key)
    return [os.path.join(folder, f) for f in files]

def ensure_dirs():
    os.makedirs('assets/frames/hero', exist_ok=True)
    os.makedirs('assets/frames/hero-mobile', exist_ok=True)
    os.makedirs('assets/frames/dismantle', exist_ok=True)
    os.makedirs('assets/frames/dismantle-mobile', exist_ok=True)
    os.makedirs('assets/cars', exist_ok=True)

def process_single_frame(task):
    src_path, dest_desktop, dest_mobile = task
    with Image.open(src_path) as im:
        im = im.convert('RGB')
        w, h = im.size
        
        # Desktop: 1600px wide, quality 78
        h_desk = round(1600 * h / w)
        im_desk = im.resize((1600, h_desk), Image.Resampling.LANCZOS)
        im_desk.save(dest_desktop, 'WEBP', quality=78, method=4)
        
        # Mobile: 960px wide, quality 72
        h_mob = round(960 * h / w)
        im_mob = im.resize((960, h_mob), Image.Resampling.LANCZOS)
        im_mob.save(dest_mobile, 'WEBP', quality=72, method=4)

def main():
    ensure_dirs()
    
    # 1. Gather hero frames
    # clip1: all 40 frames
    # clip2: skip 1st frame (39 frames)
    # clip3: skip 1st frame (39 frames)
    c1 = get_sorted_images('clip1-zip')
    c2 = get_sorted_images('clip2-zip')
    c3 = get_sorted_images('clip3-zip')
    
    hero_sources = c1 + c2[1:] + c3[1:]
    print(f'Total Hero frames to convert: {len(hero_sources)} (Clip 1: {len(c1)}, Clip 2: {len(c2)-1}, Clip 3: {len(c3)-1})')
    
    hero_tasks = []
    for idx, src in enumerate(hero_sources, start=1):
        num_str = f'{idx:04d}'
        dest_desktop = f'assets/frames/hero/frame_{num_str}.webp'
        dest_mobile = f'assets/frames/hero-mobile/frame_{num_str}.webp'
        hero_tasks.append((src, dest_desktop, dest_mobile))
        
    # 2. Gather dismantle frames
    dismantle_sources = get_sorted_images('flow-clip-zip')
    print(f'Total Dismantle frames to convert: {len(dismantle_sources)}')
    
    dismantle_tasks = []
    for idx, src in enumerate(dismantle_sources, start=1):
        num_str = f'{idx:04d}'
        dest_desktop = f'assets/frames/dismantle/frame_{num_str}.webp'
        dest_mobile = f'assets/frames/dismantle-mobile/frame_{num_str}.webp'
        dismantle_tasks.append((src, dest_desktop, dest_mobile))
        
    all_tasks = hero_tasks + dismantle_tasks
    print(f'Starting conversion of {len(all_tasks)} frame pairs...')
    
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as executor:
        list(executor.map(process_single_frame, all_tasks))
        
    print('All frames converted successfully!')

if __name__ == '__main__':
    main()

