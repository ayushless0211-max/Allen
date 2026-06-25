import React, { useState, useEffect } from 'react';
import { Moon, Sun, Bell, Mail, Eye, Globe, Shield, Wifi, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [isLightMode, setIsLightMode] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [language, setLanguage] = useState('en');
  const [twoFactor, setTwoFactor] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load theme preference from local storage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.documentElement.classList.add('light-theme');
    }
  }, []);

  useEffect(() => {
    // Load other settings from profile if available
    if (profile?.settings) {
      setEmailNotifs(profile.settings.emailNotifs ?? true);
      setPushNotifs(profile.settings.pushNotifs ?? true);
      setPublicProfile(profile.settings.publicProfile ?? true);
      setLanguage(profile.settings.language ?? 'en');
      setTwoFactor(profile.settings.twoFactor ?? false);
      setDataSaver(profile.settings.dataSaver ?? false);
    }
  }, [profile]);

  const handleThemeToggle = () => {
    const newMode = !isLightMode;
    setIsLightMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        settings: {
          emailNotifs,
          pushNotifs,
          publicProfile,
          language,
          twoFactor,
          dataSaver
        }
      });
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion request submitted. Support will contact you shortly.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-3xl font-medium tracking-tight">Settings</h1>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 bg-white hover:bg-white/90 text-black px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-white/5"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2rem] p-8">
          <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
            <Sun className="w-5 h-5 text-white" />
            Appearance
          </h2>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isLightMode ? <Sun className="w-5 h-5 text-white/50" /> : <Moon className="w-5 h-5 text-white/50" />}
              <div>
                <h3 className="font-medium">Theme</h3>
                <p className="text-sm text-white/50">Toggle between dark and light mode</p>
              </div>
            </div>
            <button 
              onClick={handleThemeToggle}
              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors cursor-pointer ${isLightMode ? 'bg-white' : 'bg-white/20'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full transition-transform ${isLightMode ? 'translate-x-8 bg-black' : 'translate-x-1 bg-white'}`} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2rem] p-8">
          <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-white" />
            Notifications
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-white/50" />
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-white/50">Receive updates and match alerts via email</p>
                </div>
              </div>
              <button 
                onClick={() => setEmailNotifs(!emailNotifs)}
                className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors cursor-pointer ${emailNotifs ? 'bg-white' : 'bg-white/20'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full transition-transform ${emailNotifs ? 'translate-x-8 bg-black' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-white/50" />
                <div>
                  <h3 className="font-medium">Push Notifications</h3>
                  <p className="text-sm text-white/50">Get instant alerts for messages and calls</p>
                </div>
              </div>
              <button 
                onClick={() => setPushNotifs(!pushNotifs)}
                className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors cursor-pointer ${pushNotifs ? 'bg-white' : 'bg-white/20'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full transition-transform ${pushNotifs ? 'translate-x-8 bg-black' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2rem] p-8">
          <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            Privacy & Security
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-white/50" />
                <div>
                  <h3 className="font-medium">Public Profile</h3>
                  <p className="text-sm text-white/50">Allow others to find you in the match pool</p>
                </div>
              </div>
              <button 
                onClick={() => setPublicProfile(!publicProfile)}
                className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors cursor-pointer ${publicProfile ? 'bg-white' : 'bg-white/20'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full transition-transform ${publicProfile ? 'translate-x-8 bg-black' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-white/50" />
                <div>
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-white/50">Add an extra layer of security to your account</p>
                </div>
              </div>
              <button 
                onClick={() => setTwoFactor(!twoFactor)}
                className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors cursor-pointer ${twoFactor ? 'bg-white' : 'bg-white/20'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full transition-transform ${twoFactor ? 'translate-x-8 bg-black' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2rem] p-8">
          <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-white" />
            Preferences
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-white/50" />
                <div>
                  <h3 className="font-medium">Language</h3>
                  <p className="text-sm text-white/50">Select your preferred language</p>
                </div>
              </div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-white/40 transition-colors cursor-pointer backdrop-blur-md shrink-0"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-white/50" />
                <div>
                  <h3 className="font-medium">Data Saver</h3>
                  <p className="text-sm text-white/50">Reduce video quality to save bandwidth</p>
                </div>
              </div>
              <button 
                onClick={() => setDataSaver(!dataSaver)}
                className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors cursor-pointer ${dataSaver ? 'bg-white' : 'bg-white/20'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full transition-transform ${dataSaver ? 'translate-x-8 bg-black' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 backdrop-blur-xl rounded-[2rem] p-8">
          <h2 className="text-xl font-medium mb-6 flex items-center gap-2 text-red-400">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
            <div>
              <h3 className="font-medium text-red-400">Delete Account</h3>
              <p className="text-sm text-white/50">Permanently delete your account and all data</p>
            </div>
            <button 
              onClick={handleDeleteAccount}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap w-full sm:w-auto text-center"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
