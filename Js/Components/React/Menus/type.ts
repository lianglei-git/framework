import React from 'react';
import { DOMAttributes } from 'react'
function toFunc<T>(value: T): T extends (() => any) ? T : () => T {
    const isFunc = Object.prototype.toString.call(value) == "[object Function]";
    if (isFunc) {
        return value as T extends (() => any) ? T : never;;
    }
    return (() => value) as T extends (() => any) ? T : never;
}

type IAdapterFunc<T> = ((...args: any[]) => T) | T;
type MenuTypesChildren = {
    visible: IAdapterFunc<boolean>;
    key: IAdapterFunc<string>;
    type: IAdapterFunc<string>;
    label: IAdapterFunc<string | JSX.Element>;
    // 占位符，直接渲染jsx
    placeholder?: IAdapterFunc<string | JSX.Element>;
    disabled?: IAdapterFunc<boolean>;
    active?: IAdapterFunc<boolean>;
    // 如果为null或者false则不展示
    icon?: IAdapterFunc<string | boolean | null | JSX.Element>;
    domAttributes?: DOMAttributes<HTMLElement>;
    children?: MenuTypesChildren[];
};
type MenuTypes = {
    visible: IAdapterFunc<boolean>;
    key: IAdapterFunc<string>;
    groupName: IAdapterFunc<string>;
    children: MenuTypesChildren[] | (() => MenuTypesChildren[]);
}[];

export {
    MenuTypes,
    MenuTypesChildren,
    toFunc
}
