import { computed, makeAutoObservable, observable, reaction } from "mobx";
import { getAvatarSrc, getDefatilsUserInfoAPI, loginAPIv1 } from "./api";

const localStorage = globalThis.localStorage || {
  getItem: () => null,
  setItem: () => null,
  removeItem: () => null,
  clear: () => null,
}
export enum UserLevelENUM {
  SuperUser = 0,
  Developer = 1,
  NormalUser = 2,

  // TODO: 其他用户，蛮多状态的
}

class UserStore {
  showLoginPage: boolean = false;
  detailsUserInfo: any = null;
  static basicInfo = {
    username: "",
    nickname: "",
    remark: "",
    token: "",
    id: "",
    avatar: undefined,
    role: UserLevelENUM["NormalUser"],
  };
  info = UserStore.basicInfo;

  constructor() {
    makeAutoObservable(this);
    this.getLocalStorageUserInfo()

  }

  login = ({ username, password }, callback?: () => void) => {
    loginAPIv1({ username, password }).then(async (res) => {
      const type = res.data.code == 0 ? "success" : "error";
      console.log(type, res.data.message);
      if (res.data.code == 0) {
        this.info.token = res.data.token;
        // 第一次登录请求一下详细信息
        await this.requestUserDetailsInfo();
        this.info = {
          username,
          remark: this.detailsUserInfo.remark,
          nickname: this.detailsUserInfo.nickname,
          token: res.data.token,
          id: res.data.id,
          avatar: res.data.avatar,
          role: res.data.role,
        };
        this.setLocalStorageUserInfo();
        callback();
      }
    });
  };


  getLocalStorageUserInfo() {
    const info = localStorage.getItem("t_remeberInfo");
    if (info) {
      this.info = { ...this.info, ...JSON.parse(info) };
    }
    return info;
  }
  setLocalStorageUserInfo() {
    localStorage.setItem("t_remeberInfo", JSON.stringify(this.info));
  }

  // 请求用户详细信息
  async requestUserDetailsInfo() {
    const res = await getDefatilsUserInfoAPI();
    this.detailsUserInfo = res.data;
  }

  get user() {
    return this.info.username;
  }
  get nickName() {
    return this.info.nickname;
  }

  get token() {
    return this.info.token;
  }
  get id() {
    return this.info.id;
  }

  get avatarSrc() {
    return getAvatarSrc(this.info.avatar);
  }

  get isLogin() {
    return this.token ? true : false;
  }

  logout = () => {
    localStorage.setItem("t_remeberInfo", "");
    // history.go(0);
    this.info = UserStore.basicInfo;
  };

  get role(): UserLevelENUM {
    return this.info.role;
  }

  setUserInfo = (userInfo: any, token: string) => {
    this.info = {
      username: userInfo.username || userInfo.openid || '',
      nickname: userInfo.nickname || '',
      remark: userInfo.remark || '',
      token: token || '',
      id: userInfo.id || '',
      avatar: userInfo.avatar || userInfo.headimgurl || undefined,
      role: userInfo.role || UserLevelENUM.NormalUser,
    };
    this.setLocalStorageUserInfo();
  }
}

const globalUserStore = new UserStore()
export {
  globalUserStore
};
