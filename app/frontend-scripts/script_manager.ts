export class Script {
	onLoadCallback: (() => Promise<void>) | null = null;
	onUnloadCallback: (() => Promise<void>) | null = null;
	loaded: boolean = false;

	constructor(
		onLoadCallback?: () => Promise<void>,
		onUnloadCallback?: () => Promise<void>
	) {
		if (onLoadCallback !== undefined) this.onLoadCallback = onLoadCallback;
		if (onUnloadCallback !== undefined) this.onUnloadCallback = onUnloadCallback;
	}

	public async load() {
		if (this.loaded) return;
		await this.onLoadCallback?.();
		this.loaded = true;
	}

	public async unload() {
		if (!this.loaded) return;
		await this.onUnloadCallback?.();
		this.loaded = false;
	}
}

// this is supposed to manage script loading and unloading for different routes
export class ScriptManager {
	private scripts: Map<string, Script[]> = new Map();
	private loaded: string[] = [];

	// this is for registering a script
	public registerScript(name: string, script: Script) {
		if (!this.scripts.has(name)) this.scripts.set(name, []);
		this.scripts.get(name)?.push(script);
		console.log(`[ScriptManager] Registered script for ${name}`);
	}

	// for unregistering
	public unregisterScript(name: string) {
		this.scripts.delete(name);
		console.log(`[ScriptManager] Unregistered scripts for ${name}`);
	}

	public async load(scripts: string[]) {
		const scriptsToUnload = this.loaded.filter(
			(loadedScript) => !scripts.includes(loadedScript)
		);

		for (const scriptName of scriptsToUnload) {
			console.info(`[ScriptManager] Unloading ${scriptName}...`);
			await this.unloadScript(scriptName);
		}

		const scriptsToLoad = scripts.filter(
			(scriptName) => !this.loaded.includes(scriptName)
		);

		for (const scriptName of scriptsToLoad) {
			console.info(`[ScriptManager] Loading ${scriptName}...`);
			await this.loadScript(scriptName);
		}
	}

	public async unloadAll() {
		for (const scriptName of this.loaded) {
			await this.unloadScript(scriptName);
		}
	}

	// when going to a route load specific scripts
	public async loadScript(name: string) {
		const scripts = this.scripts.get(name);
		if (!scripts) {
			console.info(
				`[ScriptManager] No scripts found for ${name}... skipping!`
			);
			return;
		}

		const res = await Promise.allSettled(
			scripts.map(async (script) => {
				script.load();
			})
		);

		const failures = res.filter((result) => result.status === 'rejected');
		if (failures.length > 0) {
			console.error(
				`[ScriptManager] Failed to load ${failures.length} script(s) for: ${name}`
			);
			failures.forEach((failure, index) => {
				console.error(
					`[ScriptManager] Script ${index} failed:`,
					(failure as PromiseRejectedResult).reason
				);
			});
		}

		this.loaded.push(name);
	}

	// when unloading a route
	public async unloadScript(name: string) {
		const scripts = this.scripts.get(name);
		if (!scripts) return;

		if (!this.loaded.find((n) => n === name)) return;

		await Promise.allSettled(
			scripts.map(async (script) => {
				script.unload();
			})
		);
		this.loaded = this.loaded.filter((n) => n !== name);
	}
}
