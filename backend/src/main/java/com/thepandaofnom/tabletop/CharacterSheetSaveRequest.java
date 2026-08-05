package com.thepandaofnom.tabletop;

public class CharacterSheetSaveRequest {
    private String saveName;
    private String sheetType;
    private String sheetJson;

    public String getSaveName() { return saveName; }
    public void setSaveName(String saveName) { this.saveName = saveName; }
    public String getSheetType() { return sheetType; }
    public void setSheetType(String sheetType) { this.sheetType = sheetType; }
    public String getSheetJson() { return sheetJson; }
    public void setSheetJson(String sheetJson) { this.sheetJson = sheetJson; }
}
