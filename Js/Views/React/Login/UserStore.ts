import { computed, makeObservable, observable, reaction } from "mobx";
import { getAvatarSrc, getDefatilsUserInfoAPI, loginAPIv1 } from "./api";
import { Message } from "@sparrowend/ui";

export enum UserLevelENUM {
  SuperUser = 0,
  Developer = 1,
  NormalUser = 2,

  // TODO: 其他用户，蛮多状态的
}

class UserStore {
  @observable showLoginPage: boolean = false;
  @observable detailsUserInfo: any = null;
  static basicInfo = {
    username: "",
    nickname: "",
    remark: "",
    token: "",
    id: "",
    avatar: undefined,
    role: UserLevelENUM["NormalUser"],
  };
  @observable info = UserStore.basicInfo;

  constructor() {
    makeObservable(this);
    this.getLocalStorageUserInfo()

    let infinitiesMsg;
    reaction(
      () => this.showLoginPage,
      () => {
        if (this.showLoginPage) {
          infinitiesMsg = Message.info({
            message: "登录后会刷新页面",
            duration: 0,
          });
        } else {
          infinitiesMsg.close();
        }
      }
    );
  }

  login = ({ username, password }, callback?: () => void) => {
    loginAPIv1({ username, password }).then(async (res) => {
      const type = res.data.code == 0 ? "success" : "error";
      console.message(type, res.data.message);
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

  @computed get avatarSrc() {
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
}

export default UserStore;
