# Func: 原始文本与TTS转录文本相似度

# 校验数据是否符合要求的数据


# 1. 使用whisper校验
# 2. 去除所有标点符号
# 3. 文本长度不一致，直接pass



from faster_whisper import WhisperModel
from pathlib import Path
import torch
import re
import string
import os
import json
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import CountVectorizer
from similar import levenshtein_similarity
import wave
import json

print(levenshtein_similarity)

# config
targetPath = [
    # '/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/med-word-1.json',
    # '/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/med-word-2.json',
    # '/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/med-word-3.json',
    # '/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/med-word-4.json',
    # '/home/apple/Zayne/fine-turning-whisper-turbo/finally_json/demo-4-23.json'
    # "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/腹部和心脏.json",
    # "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/甲状腺.json",
    # "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/乳腺.json"
    "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/肝肝肝.json"
]
config = {
    "audio": {
        "duration": {
            "max": 30,
            "min": 2,
            "logs":{}
        },
    }
}

rewriteDir = "./corrected_json"



# 获取音频时长
def get_duration_wave(file_path):
   with wave.open(file_path, 'r') as audio_file:
      frame_rate = audio_file.getframerate()
      n_frames = audio_file.getnframes()
      duration = n_frames / float(frame_rate)
      return duration

def calculate_cosine_similarity(text1, text2):
    vectorizer = CountVectorizer()
    corpus = [text1, text2]
    vectors = vectorizer.fit_transform(corpus)
    similarity = cosine_similarity(vectors)
    return similarity[0][1]

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


def getbasename(path):
    return os.path.basename(path)

def load_model():
    model_path = "/home/apple/Zayne/speaches-server/speaches/models/faster-whisper-model"
    model = WhisperModel(model_path, device="cuda" if torch.cuda.is_available() else "cpu", compute_type='int8')
    return model

model = load_model()

def transformText(filename):
    segments, info = model.transcribe(filename,language='zh', beam_size=5, vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500))
    txt = ''
    for segment in segments:
        txt += segment.text
    return txt


def remove_punctuation(text):
    # 定义要移除的标点符号
    punctuation = string.punctuation + '，。；：？！“”‘’'
    # 使用 str.translate() 方法移除标点符号
    return text.translate(str.maketrans('', '', punctuation))



def processingSentence(d):
    # cn2an.cn2an("一二三", "normal")

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
            "fristedLen":0,
            "secondLen":0,
        }
    clone_json_data = {}
    print("原始数据长度: ", len(json_data.keys()))
    for k in json_data:
        duration = logic_audio_rightful(json_data[k])
        logs[path]["totalCount"]+=1
        if duration != False:
            # 计算总时长
            logs[path]["totcalDuration"]+=duration
            clone_json_data[k] = processingSentence(json_data[k])
        else:
            logs[path]["illegalCount"]+=1
    print("第一轮过滤后数据长度: ", len(clone_json_data.keys()))
    logs[path]["fristedLen"] = len(clone_json_data.keys())
    return clone_json_data


def write_json(path: str, data: dict):
    """
    Write json data to a file
    :param path: The path to the json file
    :param data: The json data to be written
    """
    with open(path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)


def correct_dataset(obj):
    originTxt = remove_punctuation(obj["sentence"])
    transcribeTxt = remove_punctuation(transformText(obj["path"]))

    
    similar = levenshtein_similarity(originTxt, transcribeTxt)
    if len(transcribeTxt) == 0:
        print("转录文本为空，跳过")
        return False
    
    print(" ")

    print("-"*90)
    print("原始文本：", originTxt)
    print("转录文本：", transcribeTxt)
    print("相似度：", similar)
    if similar > 0.6:
        return True
    return False
   

def _main():
    global config
    logs = config["audio"]["duration"]["logs"]
    mistakeD = {}
    for path in targetPath:
        dj = filter_json(path)
        # 读取文件
        # with open(path, 'r', encoding='utf-8') as f:
        # dj = json.load(f)
        reData = {}
        for key in dj:
            isHit = correct_dataset(dj[key])
            if isHit:
                reData[key] = dj[key]
            else:
                mistakeD[key] = dj[key]
        logs[path]["secondLen"] = len(reData.keys())
        
        print("第二轮过滤后数据长度: ", len(reData.keys()))
        with open(rewriteDir+"/"+getbasename(path), 'w', encoding='utf-8') as f2:
            json.dump(reData, f2, ensure_ascii=False, indent=4)
    with open(rewriteDir+"/mistake.josn", 'w', encoding='utf-8') as f2:
        json.dump(mistakeD, f2, ensure_ascii=False, indent=4)
        # 解析 JSON 数据



if __name__ == "__main__":
    _main()