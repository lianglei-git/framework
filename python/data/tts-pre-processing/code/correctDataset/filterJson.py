"""
Filter out the appropriate json text, which may include the legitimacy of the audio path, the audio length, etc
"""
import cn2an
import os
import wave
import json

config = {
    "audio": {
        "duration": {
            "max": 30,
            "min": 2,
            "logs":{}
        },
    }
}

# 获取音频时长
def get_duration_wave(file_path):
   with wave.open(file_path, 'r') as audio_file:
      frame_rate = audio_file.getframerate()
      n_frames = audio_file.getnframes()
      duration = n_frames / float(frame_rate)
      return duration

# file_path = 'example.wav'
# duration = get_duration_wave(file_path)
# print(f"Duration: {duration:.2f} seconds")


i = 0
# 路径合法化
def logic_audio_path_rightful(itemData: dict):
    return os.path.exists(itemData["path"])
    
# 音频合法化
def logic_audio_rightful(itemData: dict):
    hit = logic_audio_path_rightful(itemData)
    if hit == False:
        return False
    d = get_duration_wave(itemData["path"])

    # 音频时长小于两秒则不合法
    if d < config["audio"]["duration"]["min"] or d > config["audio"]["duration"]["max"]:
        return False
    return d


def processingSentence(d):
    cn2an.cn2an("一二三", "normal")

    return d


def filter_json(path: str):
    global config
    """
    Filter out the appropriate json text, which may include the legitimacy of the audio path, the audio length, etc
    :param json_data: The json data to be filtered
    :return: The filtered json data
    """
    with open(path, 'r', encoding='utf-8') as file:
        try:
            json_data = json.load(file)
        except:
            json_data = {}

    logs = config["audio"]["duration"]["logs"]
    if path not in logs:
        logs[path] = {
            "illegalCount": 0,
            "totalCount":0,
            "totcalDuration": 0,
        }
    clone_json_data = {}
    for k in json_data:
        duration = logic_audio_rightful(json_data[k])
        logs[path]["totalCount"]+=1
        if duration != False:
            # 计算总时长
            logs[path]["totcalDuration"]+=duration
            clone_json_data[k] = processingSentence(json_data[k])
        else:
            logs[path]["illegalCount"]+=1
    return clone_json_data


def write_json(path: str, data: dict):
    """
    Write json data to a file
    :param path: The path to the json file
    :param data: The json data to be written
    """
    with open(path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)


def _main():
    backlogs = [
        {
            "target_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/腹部和心脏.json",
            "write_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/demo-4-18.json"
        },
        {
            "target_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/custom_file_json/demo-4-21.json",
            "write_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/demo-4-21.json"
        },
        {
            "target_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/custom_file_json/med-word-1.json",
            "write_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/med-word-1.json"
        },
        {
            "target_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/custom_file_json/med-word-2.json",
            "write_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/med-word-2.json"
        },
        {
            "target_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/custom_file_json/med-word-3.json",
            "write_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/med-word-3.json"
        },
         {
            "target_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/custom_file_json/med-word-4.json",
            "write_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/med-word-4.json"
        },
         {
            "target_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/custom_file_json/demo-4-23.json",
            "write_json_path": "/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/demo-4-23.json"
        }
    ]

    for item in backlogs:
        target_json_path = item["target_json_path"]
        write_json_path = item["write_json_path"]
        if not os.path.exists(target_json_path):
            print("json file not exists: ", target_json_path)
            continue
        filter_json(target_json_path)
        # write_json(write_json_path, filter_json(target_json_path))


    print("logs: ",config)


if __name__ == "__main__":
    _main()
