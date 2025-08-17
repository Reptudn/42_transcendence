interface ScriptCallback {
	onScriptLoad: () => Promise<void>;
	onScriptUnload: () => Promise<void>;
}

// this is supposed to manage script loading and unloading for different routes
class ScriptManager {
	private callbacks: Map<string, ScriptCallback[]> = new Map();
	private activeRoute: string | null = null;

	// this is for registering a script
	public registerScript(route: string, callback: ScriptCallback[]) {
		if (!this.callbacks.has(route)) this.callbacks.set(route, []);
		this.callbacks.get(route)?.push(...callback);
	}

	// for unregistering
	public unregisterScript(route: string) {
		this.callbacks.delete(route);
	}

	// this is for switching routes which calls unload and then load
	public async switchToRoute(route: string) {
		if (this.activeRoute === route) return;

		if (this.activeRoute) {
			await this.unloadRoute(this.activeRoute);
		}

		await this.loadRoute(route);
	}

	// when going to a route load a specific script
	public async loadRoute(route: string) {
		const callbacks = this.callbacks.get(route);
		if (!callbacks) return;

		await Promise.allSettled(
			callbacks.map((callback) => callback.onScriptLoad())
		);
		this.activeRoute = route;
	}

	// when unloading a route
	public async unloadRoute(route: string) {
		const callbacks = this.callbacks.get(route);
		if (!callbacks) return;

		await Promise.allSettled(
			callbacks.map((callback) => callback.onScriptUnload())
		);
		this.activeRoute = null;
	}
}
