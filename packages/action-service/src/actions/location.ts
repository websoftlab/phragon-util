import type { ActionService } from "../ActionService";

export interface LocationActionProps {
	href: string;
	target?: string;
	timeout?: number;
}

export interface LocationReloadActionProps {
	timeout?: number;
}

let form: HTMLFormElement | null = null;

function gotoTimeout(goto: Function, timeout: number) {
	if (timeout > 0) {
		window.setTimeout(goto, timeout);
	} else {
		goto();
	}
}

function locationGoto(service: ActionService, props: LocationActionProps) {
	let { href, target = "", timeout = 0 } = props;
	if (!href) {
		service.emit("debug", {
			id: "location-failure",
			level: "error",
			message: "The `href` option is empty",
		});
		return;
	}

	let goto: Function;

	if (!target || target === "_self") {
		goto = () => {
			window.location.assign(href);
		};
	} else {
		if (!form) {
			form = document.createElement("form");
			form.method = "GET";
			form.style.position = "absolute";
			form.style.left = "0";
			form.style.top = "-100px";
			form.style.visibility = "hidden";
			document.body.appendChild(form);
		}

		form.setAttribute("target", target);
		form.setAttribute("action", href);
		form.target = target;
		form.action = href;

		goto = () => {
			try {
				(form as HTMLFormElement).submit();
			} catch (err) {
				service.emit("debug", {
					id: "location-failure",
					level: "error",
					message: (err as any).message || String(err),
				});
			}
		};
	}

	gotoTimeout(goto, timeout);
}

function locationReload(_service: ActionService, props: LocationReloadActionProps) {
	const { timeout = 0 } = props;
	gotoTimeout(() => {
		window.location.reload();
	}, timeout);
}

function locationSSR(service: ActionService, name: string) {
	service.emit("debug", {
		id: "location-failure",
		level: "error",
		message: `Action '${name}' is not supported on the server side`,
	});
}

export function addLocationAction(service: ActionService) {
	if (typeof window !== "undefined" && window.location) {
		return service.addActions({
			location: (props: LocationActionProps) => locationGoto(service, props),
			"location.reload": (props: LocationReloadActionProps) => locationReload(service, props),
		});
	} else {
		return service.addActions({
			location: () => locationSSR(service, "location"),
			"location.reload": () => locationSSR(service, "location.reload"),
		});
	}
}
