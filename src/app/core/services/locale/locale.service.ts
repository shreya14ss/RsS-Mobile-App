import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { HttpClient } from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})

export class LocaleService  {
    public Locale: any = null;
    async init()
    {
        if (this.Locale == null || this.Locale == undefined)
            await this.getLocaleData().toPromise().then((data: any) => { this.Locale = data; }, error => { this.Locale = null; });
    }
   
    constructor(public _http: HttpClient, @Inject(LOCALE_ID) protected localeId: string) {}
    
    private getLocaleData()
    {
        let locale = localStorage.getItem("LOCALE_ID");
        if (locale == null || locale == undefined)
        {
            let lang = this._http.get('assets/locale/lang_en-US.json');
            console.log(lang)
            return lang;
        }
        else
        {
            return this._http.get("assets/locale/lang_" + locale + ".json");
        }
    }
}
