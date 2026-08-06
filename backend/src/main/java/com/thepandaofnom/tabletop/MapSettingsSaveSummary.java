package com.thepandaofnom.tabletop;

public class MapSettingsSaveSummary {
    private final Long id;
    private final String saveName;

    public MapSettingsSaveSummary(Long id, String saveName) {
        this.id = id;
        this.saveName = saveName;
    }

    public Long getId() {
        return id;
    }

    public String getSaveName() {
        return saveName;
    }
}
