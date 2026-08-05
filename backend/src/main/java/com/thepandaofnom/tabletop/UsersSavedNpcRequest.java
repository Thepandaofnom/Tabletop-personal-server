package com.thepandaofnom.tabletop;

public class UsersSavedNpcRequest {
    private String saveName;
    private String npcJson;

    public String getSaveName() { return saveName; }
    public void setSaveName(String saveName) { this.saveName = saveName; }
    public String getNpcJson() { return npcJson; }
    public void setNpcJson(String npcJson) { this.npcJson = npcJson; }
}
