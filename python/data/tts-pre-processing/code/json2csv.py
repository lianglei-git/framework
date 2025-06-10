

import json
import csv

"""
需求：将json中的数据转换成csv文件
"""
def json2csv(r,w):
    # 1.分别 读，创建文件
    json_fp = open(r, "r",encoding='utf-8')
    csv_fp = open(w, "w",encoding='utf-8',newline='')

    # 2.提出表头和表的内容
    data = json.load(json_fp)


    sheet_title = ["client_id", "path", "sentence","up_votes", "down_votes","age", "gender","accents","locale","segment"]

    # sheet_title = {"姓名","年龄"}  # 将表头改为中文
    sheet_data = []

    for (k,v) in data.items():
        
        sheet_data.append([
        #    v["client_id"], 
        "",
           v["path"], 
           (v["sentence"][:-1] if v["sentence"][len(v["sentence"]) - 1] == ',' else v["sentence"]).replace("，",""), 
           v["up_votes"], 
           v["down_votes"], 
           v["age"], 
           v["gender"], 
           v["accents"], 
           v["locale"], 
        #    v["segment"], 
        ""
        ])

    # for data in  data:
    #     sheet_data.append(data.values())

    # 3.csv 写入器
    writer = csv.writer(csv_fp, delimiter="	")

    # 4.写入表头
    writer.writerow(sheet_title)

    # 5.写入内容
    writer.writerows(sheet_data)

    # 6.关闭两个文件
    json_fp.close()
    csv_fp.close()


if __name__ == "__main__":
    files = [
        # {
        #     "r": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/腹部和心脏.json",
        #     "w": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/腹部和心脏.csv",
        # },
        # {
        #     "r": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/甲状腺.json",
        #     "w": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/甲状腺.csv",
        # },
        {
            "r": "/home/apple/Zayne/fine-turning-whisper-turbo/data/code/correctDataset/corrected_json/肝肝肝.json",
            "w": "/home/apple/Zayne/fine-turning-whisper-turbo/data/final/肝肝肝.csv",
        },
    ]
    for file in files:
        r = file["r"]
        w = file["w"]
        json2csv(r,w)
