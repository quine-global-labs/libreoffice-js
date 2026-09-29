/**
 * UNO command labels — counterpart of
 * officecfg/registry/data/org/openoffice/Office/UI/GenericCommands.xcu and
 * WriterCommands.xcu. "~" marks the mnemonic, as upstream.
 */
export interface UnoCommandInfo {
  /** Menu / general label. */
  label: string;
  /** Tooltip, when different from the label. */
  tooltip?: string;
}

export const COMMANDS: Record<string, UnoCommandInfo> = {
  // Top-level menus
  ".uno:PickList": { label: "~File" },
  ".uno:EditMenu": { label: "~Edit" },
  ".uno:ViewMenu": { label: "~View" },
  ".uno:InsertMenu": { label: "~Insert" },
  ".uno:FormatMenu": { label: "F~ormat" },
  ".uno:FormatStylesMenu": { label: "St~yles" },
  ".uno:TableMenu": { label: "T~able" },
  ".uno:ToolsMenu": { label: "~Tools" },
  ".uno:WindowList": { label: "~Window" },
  ".uno:HelpMenu": { label: "~Help" },
  // Submenus
  ".uno:FormatTextMenu": { label: "Te~xt" },
  ".uno:AlignTextMenu": { label: "~Align Text" },
  ".uno:FormatBulletsMenu": { label: "~Lists" },
  ".uno:InsertField": { label: "Field" },
  ".uno:ZoomMenu": { label: "~Zoom" },
  ".uno:ExportAsMenu": { label: "Expor~t As" },

  // File
  ".uno:AddDirect": { label: "~New Document", tooltip: "Create New Document" },
  ".uno:Open": { label: "~Open...", tooltip: "Open File" },
  ".uno:RecentFileList": { label: "Recent Doc~uments" },
  ".uno:CloseDoc": { label: "~Close" },
  ".uno:Save": { label: "~Save", tooltip: "Save" },
  ".uno:SaveAs": { label: "Save ~As...", tooltip: "Save As" },
  ".uno:ExportTo": { label: "E~xport..." },
  ".uno:ExportDirectToPDF": { label: "Export Directly as PDF", tooltip: "Export Directly as PDF" },
  ".uno:ExportToHTML": { label: "Export as ~HTML..." },
  ".uno:ExportToText": { label: "Export as ~Plain Text..." },
  ".uno:Print": { label: "~Print...", tooltip: "Print" },
  ".uno:PrinterSetup": { label: "P~rinter Settings..." },
  ".uno:SetDocumentProperties": { label: "Propert~ies..." },
  ".uno:Quit": { label: "E~xit LibreOffice" },

  // Edit
  ".uno:Undo": { label: "~Undo" },
  ".uno:Redo": { label: "~Redo" },
  ".uno:Repeat": { label: "Repeat" },
  ".uno:Cut": { label: "Cu~t" },
  ".uno:Copy": { label: "~Copy" },
  ".uno:Paste": { label: "~Paste" },
  ".uno:PasteUnformatted": { label: "Paste Unformatted Text" },
  ".uno:SelectAll": { label: "Select ~All" },
  ".uno:SearchDialog": { label: "Find & Rep~lace...", tooltip: "Find & Replace" },
  ".uno:TrackChanges": { label: "~Record Changes" },
  ".uno:FormatPaintbrush": { label: "Clone", tooltip: "Clone Formatting" },

  // View
  ".uno:Ruler": { label: "~Rulers" },
  ".uno:StatusBarVisible": { label: "Status ~Bar" },
  ".uno:ControlCodes": { label: "Formatting Mar~ks", tooltip: "Toggle Formatting Marks" },
  ".uno:Sidebar": { label: "Side~bar" },
  ".uno:Navigator": { label: "Na~vigator" },
  ".uno:FullScreen": { label: "F~ull Screen" },
  ".uno:ZoomIn": { label: "Zoom ~In" },
  ".uno:ZoomOut": { label: "Zoom ~Out" },
  ".uno:Zoom100Percent": { label: "100%" },

  // Insert
  ".uno:InsertPagebreak": { label: "Page ~Break", tooltip: "Insert Page Break" },
  ".uno:InsertTable": { label: "~Table...", tooltip: "Insert Table" },
  ".uno:InsertGraphic": { label: "~Image...", tooltip: "Insert Image" },
  ".uno:InsertObjectChart": { label: "Chart...", tooltip: "Insert Chart" },
  ".uno:HyperlinkDialog": { label: "Hyperlin~k...", tooltip: "Insert Hyperlink" },
  ".uno:CharmapControl": { label: "S~pecial Character...", tooltip: "Insert Special Character" },
  ".uno:InsertAnnotation": { label: "Co~mment", tooltip: "Insert Comment" },
  ".uno:InsertDateField": { label: "~Date" },
  ".uno:InsertTimeField": { label: "~Time" },
  ".uno:InsertFootnote": { label: "~Footnote" },

  // Format
  ".uno:Bold": { label: "Bold" },
  ".uno:Italic": { label: "Italic" },
  ".uno:Underline": { label: "Underline" },
  ".uno:Strikeout": { label: "Strikethrough" },
  ".uno:SuperScript": { label: "Superscript" },
  ".uno:SubScript": { label: "Subscript" },
  ".uno:LeftPara": { label: "Left", tooltip: "Align Left" },
  ".uno:CenterPara": { label: "Centered", tooltip: "Align Center" },
  ".uno:RightPara": { label: "Right", tooltip: "Align Right" },
  ".uno:JustifyPara": { label: "Justified", tooltip: "Justified" },
  ".uno:DefaultBullet": { label: "Unordered List", tooltip: "Toggle Unordered List" },
  ".uno:DefaultNumbering": { label: "Ordered List", tooltip: "Toggle Ordered List" },
  ".uno:IncrementIndent": { label: "Increase Indent" },
  ".uno:DecrementIndent": { label: "Decrease Indent" },
  ".uno:ResetAttributes": { label: "Clear ~Direct Formatting", tooltip: "Clear Direct Formatting" },
  ".uno:FontColor": { label: "Font Color" },
  ".uno:CharBackColor": { label: "Character Highlighting Color" },
  ".uno:FontDialog": { label: "C~haracter..." },
  ".uno:ParagraphDialog": { label: "P~aragraph..." },
  ".uno:BulletsAndNumberingDialog": { label: "Bu~llets and Numbering..." },
  ".uno:PageDialog": { label: "Page St~yle..." },
  ".uno:FormatColumns": { label: "Colu~mns..." },
  ".uno:StyleApply": { label: "Paragraph Style", tooltip: "Set Paragraph Style" },
  ".uno:CharFontName": { label: "Font Name" },
  ".uno:FontHeight": { label: "Font Size" },

  // Styles
  ".uno:DefaultParaStyle": { label: "Default Paragraph Style" },
  ".uno:TitleParaStyle": { label: "Title" },
  ".uno:SubtitleParaStyle": { label: "Subtitle" },
  ".uno:Heading1ParaStyle": { label: "Heading 1" },
  ".uno:Heading2ParaStyle": { label: "Heading 2" },
  ".uno:Heading3ParaStyle": { label: "Heading 3" },
  ".uno:TextBodyParaStyle": { label: "Body Text" },
  ".uno:QuoteParaStyle": { label: "Quotations" },
  ".uno:PreformattedParaStyle": { label: "Preformatted Text" },
  ".uno:DesignerDialog": { label: "Manage Styles", tooltip: "Styles" },

  // Table
  ".uno:InsertRowsAfter": { label: "Rows ~Below" },
  ".uno:InsertColumnsAfter": { label: "Columns ~After" },
  ".uno:DeleteTable": { label: "~Delete Table" },

  // Tools
  ".uno:SpellingAndGrammarDialog": { label: "~Spelling...", tooltip: "Check Spelling" },
  ".uno:WordCountDialog": { label: "~Word Count..." },
  ".uno:AutoCorrectDlg": { label: "~AutoCorrect Options..." },
  ".uno:OptionsTreeDialog": { label: "~Options..." },

  // Window / Help
  ".uno:NewWindow": { label: "~New Window" },
  ".uno:CloseWin": { label: "~Close Window" },
  ".uno:HelpIndex": { label: "LibreOffice ~Help" },
  ".uno:About": { label: "A~bout LibreOffice JS" },
};

export function commandLabel(cmd: string, forTooltip = false): string {
  const info = COMMANDS[cmd];
  if (!info) return cmd.replace(/^\.uno:/, "");
  return ((forTooltip && info.tooltip) || info.label).replace("~", "");
}
