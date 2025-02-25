const clickButton = document.getElementById('clickButton') as HTMLButtonElement | null;
const clickCount = document.getElementById('clickCount') as HTMLElement | null;
const manualUpgradeButton = document.getElementById('manualUpgradeButton') as HTMLButtonElement | null;
const autoUpgradeButton = document.getElementById('autoUpgradeButton') as HTMLButtonElement | null;
const cpsDisplay = document.getElementById('afkIncome') as HTMLElement | null; // still dubbed 'cps'

const baseManualValue: number = 1;
const multiplier: number = 1.15;

const baseAutoIncome: number = multiplier / 0.15;

const baseCost: number = 10;

let clicks: number = 0;

let manualUpgradeLevel: number = 0;
let autoUpgradeLevel: number = 0;

let manualClickValue: number = baseManualValue * Math.pow(multiplier, manualUpgradeLevel);

let autoIncome: number = 0;

let manualUpgradeCost: number = Math.floor(baseCost * Math.pow(multiplier, manualUpgradeLevel));
let autoUpgradeCost: number = Math.floor(baseCost * Math.pow(multiplier, autoUpgradeLevel));

clickButton?.addEventListener('click', () => {
	clicks += manualClickValue;
	updateDisplay();
});

manualUpgradeButton?.addEventListener('click', () => {
	if (clicks >= manualUpgradeCost) {
		clicks -= manualUpgradeCost;
		manualUpgradeLevel++;
		manualClickValue = baseManualValue * Math.pow(multiplier, manualUpgradeLevel);
		manualUpgradeCost = Math.floor(baseCost * Math.pow(multiplier, manualUpgradeLevel));
		manualUpgradeButton.innerText = `Click Upgrade (Cost: ${manualUpgradeCost})`;
		updateDisplay();
	} else {
		alert('Insufficient clicks for a manual upgrade, my good fellow!');
	}
});

autoUpgradeButton?.addEventListener('click', () => {
	if (clicks >= autoUpgradeCost) {
		clicks -= autoUpgradeCost;
		autoUpgradeLevel++;
		autoIncome = baseAutoIncome * Math.pow(multiplier, autoUpgradeLevel - 1);
		autoUpgradeCost = Math.floor(baseCost * Math.pow(multiplier, autoUpgradeLevel));
		autoUpgradeButton.innerText = `Auto Upgrade (Cost: ${autoUpgradeCost})`;
		updateDisplay();
	} else {
		alert('Not enough clicks to enhance your AFK prowess!');
	}
});

function updateDisplay(): void {
	if (clickCount) {
		clickCount.innerText = Math.floor(clicks).toString();
	}
	if (cpsDisplay) {
		cpsDisplay.innerText = `CPS: ${autoIncome.toFixed(2)} | Click Value: ${manualClickValue.toFixed(2)}`;
	}
}

setInterval(() => {
	clicks += autoIncome;
	updateDisplay();
}, 1000);
