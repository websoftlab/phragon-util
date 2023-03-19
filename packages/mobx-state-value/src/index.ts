import { action, observable, makeObservable } from "mobx";

export interface MobxStateValueOptions {
	shallow?: boolean;
	deep?: boolean;
}

export class MobxStateValue<Val extends {} = {}> {
	constructor(public value: Val, options: MobxStateValueOptions = {}) {
		const { deep = false, shallow = true } = options;
		makeObservable(this, {
			value: deep ? observable.deep : shallow ? observable.shallow : observable,
			setValue: action,
		});
	}
	setValue(value: Val) {
		if (this.value === value) {
			this.value = { ...value };
		} else {
			this.value = value;
		}
	}
	getValue(): Val {
		return this.value;
	}
}
