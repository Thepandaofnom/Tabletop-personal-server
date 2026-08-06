package com.thepandaofnom.tabletop;

public class CharacterSheetSummary {
    private Long id;
    private String saveName;
    private String sheetType;

    public CharacterSheetSummary() {}
    public CharacterSheetSummary(Long id, String saveName, String sheetType) {
        this.id = id;
        this.saveName = saveName;
        this.sheetType = sheetType;
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSaveName() { return saveName; }
    public void setSaveName(String saveName) { this.saveName = saveName; }
    public String getSheetType() { return sheetType; }
    public void setSheetType(String sheetType) { this.sheetType = sheetType; }
}
