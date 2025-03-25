import { Component, HostListener, OnInit } from '@angular/core';

@Component({
	selector: 'app-menu-bar',
	templateUrl: './menu-bar.component.html',
	styleUrls: ['./menu-bar.component.css']
})
export class MenuBarComponent implements OnInit {
	isLanguageMenuOpen:boolean = false;

	languages = [
		{
			code: 'pt',
			name: 'Português',
			flag: 'assets/Flags/pt.png',
		},
		{
			code: 'en',
			name: 'English',
			flag: 'assets/Flags/en.png',
		},
		{
			code: 'es',
			name: 'Español',
			flag: 'assets/Flags/es.png',
		},
		{
			code: 'it',
			name: 'Italiano',
			flag: 'assets/Flags/it.png',
		},
		{
			code: 'fr',
			name: 'Francês',
			flag: 'assets/Flags/fr.png',
		},
	];

	// Idioma selecionado
	selectedLanguage = this.languages[0]; // Por padrão, definimos o primeiro da lista (Português)

	constructor() { }

	ngOnInit(): void {
		// 1) Verifica se existe algo no localStorage
		const storedLangCode = localStorage.getItem('selectedLang');
	
		// 2) Caso não exista, tentamos pegar o idioma do navegador
		const browserLangCode = navigator.language.substring(0, 2).toLowerCase();
	
		// 3) Verifica se esse idioma do navegador está na nossa lista
		let finalLangCode = storedLangCode
		  ? storedLangCode
		  : this.languages.some(lang => lang.code === browserLangCode)
			? browserLangCode
			: 'en'; // Se não achou o idioma do navegador, define como 'en'
	
		// 4) Define o idioma selecionado e guarda em localStorage
		this.changeLanguage(finalLangCode);
	}
	
	toggleLanguageMenu(): void {
		this.isLanguageMenuOpen = !this.isLanguageMenuOpen;
	  }
	
	  changeLanguage(code: string): void {
		const chosenLang = this.languages.find(lang => lang.code === code);
		if (chosenLang) {
		  this.selectedLanguage = chosenLang;
		  localStorage.setItem('selectedLang', chosenLang.code);
		  this.isLanguageMenuOpen = false;
		}
	  }
	
	  @HostListener('document:click', ['$event'])
	  onDocumentClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (!target.closest('.relative')) {
		  this.isLanguageMenuOpen = false;
		}
	  }

}
