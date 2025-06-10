import soundfile as sf
import matplotlib.pyplot as plt
import librosa


def loadAudio(path):
    wavsignal, rt = sf.read(path)
    audio={}
    res = librosa.resample(y=wavsignal, orig_sr=rt, target_sr=16000)
    audio["path"] = path
    audio["array"] = res
    audio["sampling_rate"]=16000
    return audio

# print("sampling rate = {} Hz, length = {} samples,".format(rt, *wavsignal.shape))
# fg=plt.figure(1)
# plt.plot(wavsignal)
# plt.show()