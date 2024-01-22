import { MenuTypes, MenuTypesChildren, toFunc } from "./type";
import { observer } from "mobx-react-lite";
import "./index.less";
const formatMemuConfig = (cfg: MenuTypes) => {
  // cfg.map(menu => {
  //     menu.visible = toFunc(menu.visible);
  //     menu.groupName = toFunc(menu.groupName);
  //     menu.key = toFunc(menu.key);

  // })
  return cfg;
};

const toClassName = (...str: string[]): string => str.join(" ");
let MenuButtonGroup = observer((props: { info: MenuTypesChildren }) => {
  const { info } = props;
  const title = toFunc(info.label)();
  const key = toFunc(info.key)();
  const children = toFunc(info.children)();

  return (
    <ul title={title} className={toClassName("button-group", key)}>
      {children?.map((child) => {
        const key = toFunc(child.key)();
        if (child.type == "button") {
          return <MenuButtonItem info={child} key={key} />;
        }
        if (child.type == "single") {
          return <MenuSingleItem info={child} key={key} />;
        }
        if (child.type == "group-button") {
          return <MenuButtonGroup info={child} key={key} />;
        }
      })}
    </ul>
  );
});
let MenuBasicGroup = observer(() => {});

let MenuButtonItem = observer(({ info }: { info: MenuTypesChildren }) => {
  const key = toFunc(info.key)();
  const label = toFunc(info.label)();
  const icon = toFunc(info.icon)();
  const disabled = toFunc(info.disabled)();
  const domAttributes = info.domAttributes || {};
  return (
    <li
      key={key}
      title={label}
      className={toClassName("menu-button", key)}
      aria-disabled={disabled}
      {...(!disabled ? domAttributes : {})}
    >
      <i className={toClassName(icon)}></i>
    </li>
  );
});

let MenuSingleItem = observer(({ info }: { info: MenuTypesChildren }) => {
  const key = toFunc(info.key)();
  const label = toFunc(info.label)();
  const icon = toFunc(info.icon)();
  const disabled = toFunc(info.disabled)();
  const active = toFunc(info.active)();
  const domAttributes = info.domAttributes || {};
  return (
    <li
      key={key}
      title={label}
      className={toClassName("menu-button", key, active ? "active" : "")}
      aria-disabled={disabled}
      {...(!disabled ? domAttributes : {})}
    >
      <i className={toClassName(icon)}></i>
    </li>
  );
});
let MenuBasic = observer(({ memuConfig }: { memuConfig: MenuTypes }) => {
  const _memuConfig = formatMemuConfig(memuConfig);

  return (
    <div className="memu-react">
      {_memuConfig.map((group) => {
        const key = toFunc(group.key)();
        const title = toFunc(group.groupName)();
        const children = toFunc(group.children)();
        return (
          <ul key={key} className={toClassName("group", key)} title={title}>
            {children.map((item) => {
              const key = toFunc(item.key)();

              if (item.type == "button") {
                return <MenuButtonItem info={item} key={key} />;
              }
              if (item.type == "single") {
                return <MenuSingleItem info={item} key={key} />;
              }
              if (item.type == "group-button") {
                return <MenuButtonGroup info={item} key={key} />;
              }
            })}
          </ul>
        );
      })}
    </div>
  );
});

export { MenuBasic };
