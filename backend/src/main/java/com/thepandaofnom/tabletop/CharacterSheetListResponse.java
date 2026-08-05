package com.thepandaofnom.tabletop;

import java.util.List;

public class CharacterSheetListResponse {
    private List<CharacterSheetSummary> saves;

    public CharacterSheetListResponse() {}
    public CharacterSheetListResponse(List<CharacterSheetSummary> saves) { this.saves = saves; }
    public List<CharacterSheetSummary> getSaves() { return saves; }
    public void setSaves(List<CharacterSheetSummary> saves) { this.saves = saves; }
}
