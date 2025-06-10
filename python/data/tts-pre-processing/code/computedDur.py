# 计算文件中音频时长
import wave


def get_duration_wave(file_path):
    try:
        with wave.open(file_path, 'r') as audio_file:
            frame_rate = audio_file.getframerate()
            n_frames = audio_file.getnframes()
            duration = n_frames / float(frame_rate)
            return duration
    except:
        return 0
    

obj = [
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/乳腺.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/甲状腺.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/腹部和心脏.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-train/demo-4-23.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-train/med-word-1.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-train/med-word-2.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-train/med-word-4.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-test/demo-4-23.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    # {
    #     "path": "/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-test/med-word-3.csv",
    #     "audioKey":"path",
    #     "duration": 0
    # },
    {
        "path": "/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/basic-train/aishell.csv",
        "audioKey":"path",
        "duration": 0
    },
    {
        "path": "/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/basic-test/aishell.csv",
        "audioKey":"path",
        "duration": 0
    },
]

import csv

total = 0
for item in obj:
    with open(item["path"], 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        for row in reader:
            t = get_duration_wave(row[0].split("\t")[1])
            item["duration"]+=t
    total += item["duration"]

print(obj)
print("总时长: ", total / 60 / 60 , "小时")

"""

医学数据
[{'path': '/home/apple/Zayne/fine-turning-whisper-turbo/data/final/乳腺.csv', 'audioKey': 'path', 'duration': 10594.026666666672}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/data/final/甲状腺.csv', 'audioKey': 'path', 'duration': 9204.197333333348}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/data/final/腹部和心脏.csv', 'audioKey': 'path', 'duration': 12104.469333333353}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-train/demo-4-23.csv', 'audioKey': 'path', 'duration': 20331.717333333356}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-train/med-word-1.csv', 'audioKey': 'path', 'duration': 4603.381333333331}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-train/med-word-2.csv', 'audioKey': 'path', 'duration': 5456.58666666667}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-train/med-word-4.csv', 'audioKey': 'path', 'duration': 19173.637333333343}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-test/demo-4-23.csv', 'audioKey': 'path', 'duration': 6510.581333333334}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/medvoc-test/med-word-3.csv', 'audioKey': 'path', 'duration': 8764.506666666668}]
医学数据时长:  26.87308444444447 小时


AIshell数据
[{'path': '/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/basic-train/aishell.csv', 'audioKey': 'path', 'duration': 227420.55086167986}, {'path': '/home/apple/Zayne/fine-turning-whisper-turbo/dev/origin-datasets/basic-test/aishell.csv', 'audioKey': 'path', 'duration': 80803.62433106564}]
总时长:  85.6178264424293 小时

"""