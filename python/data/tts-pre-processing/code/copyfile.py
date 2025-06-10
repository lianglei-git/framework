# 拷贝文件到新的文件夹下

import shutil
import os

def copy_directory(src_dir, dest_dir):
    """
    递归拷贝整个目录到目标路径（目标目录会被自动创建）
    
    参数：
        src_dir: 源目录路径
        dest_dir: 目标目录路径
    """
    try:
        # 递归拷贝目录（目标目录不能已存在）
        shutil.copytree(src_dir, dest_dir)
        print(f"目录 {src_dir} 已拷贝到 {dest_dir}")
    except FileExistsError:
        print(f"错误：目标目录 {dest_dir} 已存在")
    except Exception as e:
        print(f"拷贝失败：{e}")


def copy_single_file(src_file, dest_folder):
    """
    拷贝单个文件到目标文件夹（自动创建目标文件夹）
    
    参数：
        src_file: 源文件路径（含文件名）
        dest_folder: 目标文件夹路径
    """
    try:
        # 确保目标文件夹存在
        os.makedirs(dest_folder, exist_ok=True)
        
        # 拷贝文件（保留元数据，如修改时间）
        shutil.copy2(src_file, dest_folder)
        print(f"文件 {src_file} 已拷贝到 {dest_folder}")
        
    except FileNotFoundError:
        print(f"错误：源文件 {src_file} 不存在")
    except Exception as e:
        print(f"拷贝失败：{e}")

# 示例调用
src_directory = "/path/to/source_folder"
dest_directory = "/path/to/new_destination"



obj = [
    {
        "path": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/乳腺.csv",
        "audioKey":"path",
        "duration": 0
    },
    {
        "path": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/甲状腺.csv",
        "audioKey":"path",
        "duration": 0
    },
    {
        "path": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/腹部和心脏.csv",
        "audioKey":"path",
        "duration": 0
    }
]


import csv

for item in obj:
    with open(item["path"], 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        for row in reader:
            copy_single_file(row[0].split("\t")[1], "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/wav")