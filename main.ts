import { Console } from 'console';
import { addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SettingTab } from 'obsidian';
import { text } from 'stream/consumers';
import { NewsView, NEWS_PAGE_TYPE } from "./view";

interface Settings {
	newsLogo: string;
	newsDelay: number;
}

const DEFAULT_SETTINGS: Settings = {
	newsLogo: '❄',
	newsDelay: 7
}

export default class NewsPlugin extends Plugin {
	settings: Settings;

	// Executed when Plugin starts (Obsidian opens)
	async onload() {
		// Handle settingsof plugin
		await this.loadSettings();
		const newsLogo: string = this.settings.newsLogo;
		const newsDelay: number = this.settings.newsDelay *24*60*60*1000;

		// This calls the menu where the user can change the parameters
		this.addSettingTab(new SettingsMenu(this.app, this));

		// Add custom ribbon to library
		addIcon('New', `<text x="50" y="70" font-size="45" text-anchor="middle" fill="white">NEW</text>`);

		// This part creates the ribbon Icon to display the news view
		const ribbonIconEl2 = this.addRibbonIcon('dice', 'News Menu', (evt: MouseEvent) => {
		})

		// This creates the news Icon
		const ribbonIconEl = this.addRibbonIcon('New', 'News Icon', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice(`The news logo is : ${newsLogo}`);
		});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// This creates the menu where the user can change the parameters
export class SettingsMenu extends PluginSettingTab{
	plugin: NewsPlugin;

	constructor(app: App, plugin: NewsPlugin){
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("NewsLogo")
			.setDesc("Icon used to mark news by hand")
			.addText((text) => 
				text
					.setPlaceholder("Logo des News")
					.setValue(this.plugin.settings.newsLogo)
					.onChange(async (value) => {
						this.plugin.settings.newsLogo = value;
						await this.plugin.saveSettings();
					})
			)

		new Setting(containerEl)
		.setName("News delay")
		.setDesc("Time before considering an article 'not new anymore' (in days)")
		.addText((text) => 
			text
				.setPlaceholder("number of days")
				.setValue(this.plugin.settings.newsDelay.toString())
				.onChange(async (value) =>{
					this.plugin.settings.newsDelay = Number(value);
					await this.plugin.saveSettings();
				})
		)
	}
}
