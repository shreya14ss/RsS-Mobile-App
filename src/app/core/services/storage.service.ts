import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'access_token';
const USERNAME_KEY = 'user_name';
const LOGINID_KEY = 'login_id';
const MODE_KEY = 'mode';
const ROLES_KEY = 'roles';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  // async saveToken(token: string): Promise<void> {
  //   await Preferences.set({ key: TOKEN_KEY, value: token });
  // }

  async saveToken(token: string): Promise<void> {
    await Preferences.set({ key: TOKEN_KEY, value: token });
    sessionStorage.setItem('access_token', token);
    console.log('Token saved in Preferences + sessionStorage');
  }

  // async getToken(): Promise<string | null> {
  //   const { value } = await Preferences.get({ key: TOKEN_KEY });
  //   return value;
  // }

  async getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: TOKEN_KEY });

    if (value) {
      return value;
    }

    // 🔥 Fallback (critical fix)
    const sessionToken = sessionStorage.getItem('access_token');
    if (sessionToken) {
      console.log('Token recovered from sessionStorage');
      return sessionToken;
    }

    return null;
  }

  async saveUserName(name: string): Promise<void> {
    await Preferences.set({ key: USERNAME_KEY, value: name });
  }

  async getUserName(): Promise<string | null> {
    const { value } = await Preferences.get({ key: USERNAME_KEY });
    return value;
  }

  async saveLoginId(id: string): Promise<void> {
    await Preferences.set({ key: LOGINID_KEY, value: id });
  }

  async getLoginId(): Promise<string | null> {
    const { value } = await Preferences.get({ key: LOGINID_KEY });
    return value;
  }

  async saveMode(mode: string): Promise<void> {
    await Preferences.set({ key: MODE_KEY, value: mode });
  }

  async getMode(): Promise<string | null> {
    const { value } = await Preferences.get({ key: MODE_KEY });
    return value;
  }

  async saveRoles(roles: string): Promise<void> {
    await Preferences.set({ key: ROLES_KEY, value: roles });
  }

  async getRoles(): Promise<string | null> {
    const { value } = await Preferences.get({ key: ROLES_KEY });
    return value;
  }

  // async clear(): Promise<void> {
  //   await Preferences.clear();
  // }

  async clear(): Promise<void> {
    // Only remove auth-related keys. Do NOT call Preferences.clear() — that
    // would wipe device_id and fcm_token too, which need to survive across
    // logouts so we can re-register the same device with the backend.
    await Preferences.remove({ key: TOKEN_KEY });
    await Preferences.remove({ key: USERNAME_KEY });
    await Preferences.remove({ key: LOGINID_KEY });
    await Preferences.remove({ key: MODE_KEY });
    await Preferences.remove({ key: ROLES_KEY });
    sessionStorage.removeItem('access_token');
    console.log('Storage cleared (auth keys only)');
  }
}
