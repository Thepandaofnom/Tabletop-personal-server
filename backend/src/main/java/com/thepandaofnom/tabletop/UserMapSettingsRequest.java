package com.thepandaofnom.tabletop;

public class UserMapSettingsRequest {
    private String saveName;
    private String settingsJson;

    public String getSaveName() { return saveName; }
    public void setSaveName(String saveName) { this.saveName = saveName; }
    public String getSettingsJson() { return settingsJson; }
    public void setSettingsJson(String settingsJson) { this.settingsJson = settingsJson; }
}
