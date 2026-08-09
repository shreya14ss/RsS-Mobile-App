import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class ToastService {

    constructor(private toastController: ToastController) { }

    async show(message: string, color: string = 'primary', duration: number = 2000) {
        const toast = await this.toastController.create({
            message,
            duration,
            position: 'top',
            color
        });

        await toast.present();
    }

    async showWithAction(message: string) {
        const toast = await this.toastController.create({
            message,
            duration: 3000,
            position: 'top',
            buttons: [
                {
                    text: 'Undo',
                    handler: () => {
                        console.log('Undo clicked');
                    }
                }
            ]
        });

        await toast.present();
    }

    // optional helpers
    success(msg: string) {
        this.show(msg, 'success');
    }

    error(msg: string) {
        this.show(msg, 'danger');
    }
}