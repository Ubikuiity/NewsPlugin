import { App, ButtonComponent, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import NewsPlugin from 'main';
import { rename, access } from 'fs/promises';
import { exec } from 'child_process';
import * as path from 'path';
import { platform } from 'process';

export interface Settings {
	newsLogo: string;
	newsDelay: number;
	newsFilename: string;
	specialPaths: Array<string>;
}

export const DEFAULT_SETTINGS: Settings = {
	newsLogo: '🆕',
	newsDelay: 7,
	newsFilename: 'News.md',
	specialPaths: ['News.md']
}

// This creates the menu where the user can change the parameters
export class SettingsMenu extends PluginSettingTab {
	plugin: NewsPlugin;
	specialPathsContainer: HTMLElement;

	constructor(app: App, plugin: NewsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;
		containerEl.empty();

		// Setting for the news Logo
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

		// Setting for the news delay
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
		
		// Setting for the news file name
		new Setting(containerEl)
			.setName("News file name")
			.setDesc("Name of the file that will be created to show the news")
			.addText((text: TextComponent) =>
				text
					.setPlaceholder("file name")
					.setValue(this.plugin.settings.newsFilename.toString())
					.onChange(async (value) => {
						const basePath: string = (this.plugin.app.vault.adapter as any).basePath;
						const oldFilePath: string = path.join(basePath, this.plugin.settings.newsFilename);
						// Checks if the file already contains '.md', append it to the end otherwise
						if (value.contains(`.`)) {
							value = value.split(`.`)[0] + `.md`; // This makes sure that file name ends with .md
						}
						else {
							value = value + `.md`;
						}
						this.plugin.settings.newsFilename = value;
						const newFilePath: string =  path.join(basePath, value);
						try {
							await access(oldFilePath);  // If path exists, execute next line
							rename(oldFilePath, newFilePath);  // rename old file to new file name
						} catch {
							// News file might not be created yet
						}
						await this.plugin.saveSettings();
					})
			)
        
        // Creates a button for editing the template file with Notepad++
        const templateSetting = new Setting(containerEl)
        templateSetting.setDesc(`Use this button to edit the template file used to create the News file.
            You must use the %MNews% and %DNews% respectively for the marked news and detected news locations.\n\n
			This requires notepad++ on Windows or gedit on Linux`);
        templateSetting.addButton((button: ButtonComponent) => {
            button.setClass('templateButton');
            button.setButtonText('Template File');
            button.onClick(() => {
                // This part opens the template file used for news
                const basePath = (this.plugin.app.vault.adapter as any).basePath;
                const tempFile = path.join(basePath, '.obsidian', 'plugins', this.plugin.manifest.id, 'Ressources', 'NewsTemplate.md');
                
				// This is the part that needs to me modified to support multiples OS
				if (platform == 'win32'){exec(`start notepad++ "${tempFile}"`)}
				else if (platform == 'linux'){exec(`gedit "${tempFile}"`)};
            });
        });

        // Creates the part of settings that contains the special paths that will not be detected when creating the News file
		// This part handles the top part
        this.specialPathsContainer = containerEl.createEl("div");
        this.specialPathsContainer.createEl("h1", { text: "Special pathes" });
        this.specialPathsContainer.createEl("div", { text: "This is the part that handle special paths that will be dismissed when searching for news." });
		
		// Part with the button to create special pathes
		const pathsSetting = new Setting(this.specialPathsContainer);
		pathsSetting.setDesc('Description on how to add pathes should be here');
        pathsSetting.addButton((button: ButtonComponent) => {
            button.setClass('addSpecialPathButton');
            button.setIcon('plus-with-circle');
			button.onClick((evt: MouseEvent) => {
				// This function handles all the subparts (one part per path)
				this.plugin.settings.specialPaths.push('');  // Create the new value the plugin will write into

				let count = 0;
				for(let specialPath of this.plugin.settings.specialPaths){
					count ++;
				}

				this.addSpecialPath(this.plugin.settings.specialPaths.length - 1);
			});
        });

		this.createSpePathsFromArray();
	}

	/**
	 * This method creates a new setting that will handle the path added. **This function is particularly awful**, this is probably
	 * not the correct way to add multiple settings.
	 * 
	 * @param listIndex : number. This setting will be used to know where to write into plugin.settings.specialPaths[].
	 * @param initialValue (optional) : string = ''. This is the initial value of the special path. default value is empty string
	 */
	addSpecialPath(listIndex: number, initialValue: string = '') {
		console.log(`Adding new special path in setting`);
		// Creates the HTML element, this is required as we need something removable, and I can't find a way to remove settings
		const pathHTMLElement: HTMLElement = this.specialPathsContainer.createEl("div");
		new Setting(pathHTMLElement)  // Creates the setting in the HTML element
			.addText((text) =>
				text
					.setPlaceholder("Special Path")
					.setValue(initialValue)
					.onChange(async (value) => {
						this.plugin.settings.specialPaths[listIndex] = value;
						await this.plugin.saveSettings();
					})
			)
			// This cross button removes the element
			.addButton((button: ButtonComponent) => {
				button.setIcon('cross')
				button.onClick((evt: MouseEvent) => {
					console.log(`removing plugin special path`);
					// We can't remove the value as it would shift all indexes by 1, messing all the menu, so we put an empty string
					this.plugin.settings.specialPaths[listIndex] = '';
					pathHTMLElement.remove();  // removes the HTML element
				})
			})
	}

	async createSpePathsFromArray(){
		console.log(`Creating special pathes from list : ${this.plugin.settings.specialPaths}`)

		// We must get list lenght before looping as the list lenght will change will iterating
		const pathesLenght = this.plugin.settings.specialPaths.length;

		let count = 0;
		// Looping through all values to only get non null values, i is a basic index, count is the list index
		for(let i=0; i < pathesLenght; i++){
			const specialPath = this.plugin.settings.specialPaths[count]
			// console.log(`creating menu : index ${count}, value : ${specialPath}`);
			if (specialPath == ''){
				this.plugin.settings.specialPaths.splice(count, 1);  // removes value from array
				// Do not increase index
			}
			else{
				this.addSpecialPath(count, specialPath);  // creates the setting
				count ++;  // increase index
			}
		}
		await this.plugin.saveSettings();
		console.log(`finished creating paths from array`);
	}
}