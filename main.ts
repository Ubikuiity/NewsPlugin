import { addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SettingTab } from 'obsidian';
import { fileCreator } from "filecreator";
import { newIc, newSyncIc } from "icons";

interface Settings {
	newsLogo: string;
	newsDelay: number;
	newsFilename: string;
}

const DEFAULT_SETTINGS: Settings = {
	newsLogo: '❄',
	newsDelay: 7,
	newsFilename: 'News'
}

export default class NewsPlugin extends Plugin {
	settings: Settings;

	// Executed when Plugin starts (Obsidian opens)
	async onload() {
		// Handle settingsof plugin
		await this.loadSettings();
		const newsLogo: string = this.settings.newsLogo;
		const newsDelay: number = this.settings.newsDelay * 24 * 60 * 60 * 1000;

		//Create the display Handler
		const displayH = new fileCreator(this.settings.newsFilename, this.app.vault, newsDelay, newsLogo);

		// This calls the menu where the user can change the parameters
		this.addSettingTab(new SettingsMenu(this.app, this));

		// Add custom ribbon to library
		addIcon('New', newIc);
		addIcon('NewSynchro', newSyncIc)

		// This part creates the ribbon Icon to display the news view
		const ribbonIconEl2 = this.addRibbonIcon('NewSynchro', 'News Synchro', (evt: MouseEvent) => {
			displayH.synchroAll();
			new Notice(`reloading news page, please don't spam this button`);
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
export class SettingsMenu extends PluginSettingTab {
	plugin: NewsPlugin;

	constructor(app: App, plugin: NewsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("News Logo")
			.setDesc("Icon used to mark news by hand")
			.addText((text) =>
				text
					.setPlaceholder("News icon")
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
					.onChange(async (value) => {
						this.plugin.settings.newsDelay = Number(value);
						await this.plugin.saveSettings();
					})
			)

		new Setting(containerEl)
			.setName("News file name")
			.setDesc("Name of the file that will be created to show the news")
			.addText((text) =>
				text
					.setPlaceholder("file name")
					.setValue(this.plugin.settings.newsFilename.toString())
					.onChange(async (value) => {
						if (value.contains(`.`)) {
							value = value.split(`.`)[0] + `.md`;
						}
						else {
							value = value + `.md`;
						}
						this.plugin.settings.newsFilename = value;
						await this.plugin.saveSettings();
					})
			)
	}
}
