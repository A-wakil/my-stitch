import { useState, useEffect } from 'react';
import styles from './StyleSelector.module.css';
import { supabase } from '../../lib/supabaseClient';
import { FiBookmark, FiSave } from 'react-icons/fi';

// Define the base styles
const BASE_STYLES = [
  {
    name: 'kaftan',
    display_name: 'Kaftan',
    description: 'Long tunic that offers understated elegance and comfort, perfect for any occasion.',
    recommended_yards: 4.5
  },
  {
    name: 'senator',
    display_name: 'Senator Style',
    description: 'Two-piece outfit with clean, sharp lines, versatile and refined for formal occasions.',
    recommended_yards: 4.0
  },
  {
    name: 'dashiki',
    display_name: 'Dashiki',
    description: 'Recognizable for its bold patterns and comfortable fit, perfect for a laid-back yet cultural look.',
    recommended_yards: 3.0
  },
  {
    name: 'ankara',
    display_name: 'Ankara Design',
    description: 'Vibrant fabric that brings color and pattern to any style, from shirts to complete sets.',
    recommended_yards: 4.0
  },
  {
    name: 'agbada',
    display_name: 'Agbada',
    description: 'Majestic attire with wide sleeves and intricate embroidery, traditionally made from Aso-Oke or brocade.',
    recommended_yards: 3.5
  }
];

// Define Agbada as an addition
const AGBADA_ADDITION = {
  name: 'agbada_addition',
  display_name: 'Add Agbada',
  description: 'Add an Agbada to complete the traditional look.',
  recommended_yards: 3.5,
  is_addition: true
};

interface StyleOption {
  name: string;
  display_name: string;
  description?: string;
  recommended_yards: number;
  id?: string; // For saved styles from the database
  tailor_id?: string; // For saved styles from the database
  is_addition?: boolean; // For agbada addition
}

interface StyleSelectorProps {
  selectedStyles: StyleOption[];
  onChange: (styles: StyleOption[]) => void;
}

export default function StyleSelector({ selectedStyles, onChange }: StyleSelectorProps) {
  const [baseStyles, setBaseStyles] = useState<StyleOption[]>(BASE_STYLES);
  const [savedStyles, setSavedStyles] = useState<StyleOption[]>([]);
  const [customStyle, setCustomStyle] = useState<StyleOption>({
    name: '',
    display_name: '',
    description: '',
    recommended_yards: 4.5
  });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [saveForReuse, setSaveForReuse] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'preset' | 'saved'>('preset');
  const [showAgbadaOption, setShowAgbadaOption] = useState(false);
  const [selectedBaseStyle, setSelectedBaseStyle] = useState<string | null>(null);

  useEffect(() => {
    fetchTailorSavedStyles();
  }, []);

  // Update the UI when selected styles change
  useEffect(() => {
    // Check if we have at least one base style selected that's not Agbada
    const hasNonAgbadaBaseStyle = selectedStyles.some(style => 
      style.name !== 'agbada' && style.name !== 'agbada_addition' && !style.is_addition
    );

    // Check if Agbada is selected as a standalone
    const hasAgbadaBase = selectedStyles.some(style => style.name === 'agbada');

    // Only show Agbada addition if we have at least one non-Agbada base style
    setShowAgbadaOption(hasNonAgbadaBaseStyle);

    // Set the selected base style for UI updates (can now be multiple)
    const baseStyle = selectedStyles.find(style => 
      style.name !== 'agbada_addition' && !style.is_addition
    );
    setSelectedBaseStyle(baseStyle?.name || null);
  }, [selectedStyles]);

  const fetchTailorSavedStyles = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch saved styles for this tailor
      const { data, error } = await supabase
        .from('saved_styles')
        .select('*')
        .eq('tailor_id', user.id);

      if (error) {
        console.error('Error fetching saved styles:', error);
        return;
      }

      if (data) {
        setSavedStyles(data);
      }
    } catch (error) {
      console.error('Error fetching saved styles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a unique name for custom styles
  const generateStyleName = (displayName: string) => {
    return displayName.toLowerCase().replace(/\s+/g, '_');
  };

  const handleAddBaseStyle = (style: StyleOption) => {
    // Check if the style is already selected
    if (selectedStyles.some(s => s.name === style.name)) {
      return; // Style already selected, do nothing
    }

    if (style.name === 'agbada') {
      // Special case: If Agbada is selected as a base style, 
      // remove any Agbada addition since it doesn't make sense to have both
      const stylesWithoutAgbadaAddition = selectedStyles.filter(s => 
        s.name !== 'agbada_addition'
      );
      onChange([...stylesWithoutAgbadaAddition, { ...style }]);
    } else {
      // For all other styles, just add them to the selection
      // If we're adding a different base style and standalone Agbada exists,
      // keep the standalone Agbada (user might want multiple styles)
      onChange([...selectedStyles, { ...style }]);
    }
  };

  const handleToggleAgbadaAddition = () => {
    // Check if Agbada addition is already selected
    const hasAgbadaAddition = selectedStyles.some(s => s.name === 'agbada_addition');
    
    if (hasAgbadaAddition) {
      // Remove the Agbada addition
      onChange(selectedStyles.filter(s => s.name !== 'agbada_addition'));
    } else {
      // Add the Agbada addition
      onChange([...selectedStyles, { ...AGBADA_ADDITION }]);
    }
  };

  const handleRemoveStyle = (styleName: string) => {
    // For Agbada addition, just remove it
    if (styleName === 'agbada_addition') {
      onChange(selectedStyles.filter(style => style.name !== 'agbada_addition'));
      return;
    }
    
    // For base styles, also remove the Agbada addition since it depends on having a base style
    onChange(selectedStyles.filter(style => 
      style.name !== styleName && (styleName !== 'agbada' ? style.name !== 'agbada_addition' : true)
    ));
  };

  const handleAddCustomStyle = async () => {
    if (customStyle.display_name.trim() === '') return;
    
    const newStyle = {
      ...customStyle,
      name: customStyle.name || generateStyleName(customStyle.display_name)
    };
    
    onChange([...selectedStyles, newStyle]);
    
    // If the user wants to save this style for reuse, save it to the database
    if (saveForReuse) {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Save to the database
        const { data, error } = await supabase
          .from('saved_styles')
          .insert({
            name: newStyle.name,
            display_name: newStyle.display_name,
            description: newStyle.description,
            recommended_yards: newStyle.recommended_yards,
            tailor_id: user.id
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving style:', error);
        } else {
          // Add to saved styles with the database ID
          setSavedStyles([...savedStyles, data]);
        }
      } catch (error) {
        console.error('Error saving style:', error);
      }
    }
    
    // Reset custom style form
    setCustomStyle({
      name: '',
      display_name: '',
      description: '',
      recommended_yards: 4.5
    });
    setSaveForReuse(false);
    setShowCustomForm(false);
  };

  const handleCustomStyleChange = (field: keyof StyleOption, value: string | number) => {
    setCustomStyle(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to generate the display name for combination styles
  const getStyleDisplayName = (style: StyleOption): string => {
    // For Agbada addition, show it with the base style name
    if (style.name === 'agbada_addition') {
      const baseStyle = selectedStyles.find(s => 
        s.name !== 'agbada_addition' && !s.is_addition
      );
      if (baseStyle) {
        return `${baseStyle.display_name} & Agbada`;
      }
    }
    return style.display_name;
  };

  // Helper to calculate total yardage for all selected styles
  const getTotalYardage = (): number => {
    return selectedStyles.reduce((total, style) => total + style.recommended_yards, 0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.selectedStylesSection}>
        <h3>Selected Styles</h3>
        {selectedStyles.length === 0 ? (
          <p className={styles.noStyles}>No styles selected. Add styles from the options below.</p>
        ) : (
          <div className={styles.selectedStylesList}>
            {/* Display base style first */}
            {selectedStyles
              .filter(style => style.name !== 'agbada_addition')
              .map((style) => (
                <div key={style.name} className={styles.selectedStyleItem}>
                  <div className={styles.styleInfo}>
                    <h4>{style.display_name}</h4>
                    {style.description && <p>{style.description}</p>}
                    <span className={styles.yardage}>Recommended: {style.recommended_yards} yards</span>
                  </div>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleRemoveStyle(style.name)}
                  >
                    Remove
                  </button>
                </div>
              ))}

            {/* Display Agbada addition separately */}
            {selectedStyles
              .filter(style => style.name === 'agbada_addition')
              .map((style) => (
                <div key={style.name} className={`${styles.selectedStyleItem} ${styles.selectedAdditionItem}`}>
                  <div className={styles.styleInfo}>
                    <h4>{getStyleDisplayName(style)}</h4>
                    {style.description && <p>{style.description}</p>}
                    <span className={styles.yardage}>Additional: {style.recommended_yards} yards</span>
                  </div>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleRemoveStyle(style.name)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            
            {selectedStyles.length > 1 && (
              <div className={styles.totalYardage}>
                <p>Total Recommended Yardage: <strong>{getTotalYardage().toFixed(1)} yards</strong></p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.styleOptionsContainer}>
        <div className={styles.styleTabs}>
          <button 
            className={`${styles.styleTab} ${activeTab === 'preset' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('preset')}
          >
            Preset Styles
          </button>
          <button 
            className={`${styles.styleTab} ${activeTab === 'saved' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Your Saved Styles {savedStyles.length > 0 && `(${savedStyles.length})`}
          </button>
        </div>

        {activeTab === 'preset' && (
          <div className={styles.availableStylesSection}>
            <h3>Style Options <span className={styles.multiSelectHint}>(Select multiple styles as needed)</span></h3>
            <div className={styles.styleOptionsGrid}>
              {baseStyles.map((style) => {
                const isSelected = selectedStyles.some(s => s.name === style.name);
                return (
                  <div 
                    key={style.name} 
                    className={`${styles.styleOption} ${isSelected ? styles.styleSelected : ''}`}
                    onClick={() => !isSelected && handleAddBaseStyle(style)}
                  >
                    <h4>{style.display_name}</h4>
                    <p>{style.description}</p>
                    <span className={styles.yardage}>Recommended: {style.recommended_yards} yards</span>
                    {isSelected && <div className={styles.selectedBadge}>Selected</div>}
                  </div>
                );
              })}

              <div 
                className={`${styles.styleOption} ${styles.addCustomOption}`}
                onClick={() => setShowCustomForm(true)}
              >
                <div className={styles.addIcon}>+</div>
                <h4>Add Custom Style</h4>
                <p>Create a custom style option for your design</p>
              </div>
            </div>
            
            {/* Show Agbada addition option if a base style is selected */}
            {showAgbadaOption && (
              <div className={styles.agbadaAdditionSection}>
                <h3>Optional Addition</h3>
                <div 
                  className={`${styles.styleOption} ${selectedStyles.some(s => s.name === 'agbada_addition') ? styles.styleSelected : ''}`}
                  onClick={handleToggleAgbadaAddition}
                >
                  <h4>Add Agbada to Your Style</h4>
                  <p>Complete the traditional look by adding an Agbada to your selected style.</p>
                  <span className={styles.yardage}>Additional: {AGBADA_ADDITION.recommended_yards} yards</span>
                  {selectedStyles.some(s => s.name === 'agbada_addition') && <div className={styles.selectedBadge}>Selected</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className={styles.savedStylesSection}>
            <h3>Your Saved Styles</h3>
            {isLoading ? (
              <div className={styles.loadingMessage}>Loading your saved styles...</div>
            ) : savedStyles.length > 0 ? (
              <div className={styles.styleOptionsGrid}>
                {savedStyles.map((style) => {
                  const isSelected = selectedStyles.some(s => s.name === style.name);
                  return (
                    <div 
                      key={style.id || style.name} 
                      className={`${styles.styleOption} ${isSelected ? styles.styleSelected : ''}`}
                      onClick={() => !isSelected && handleAddBaseStyle(style)}
                    >
                      <div className={styles.savedStyleHeader}>
                        <h4>{style.display_name}</h4>
                        <FiBookmark className={styles.savedIcon} />
                      </div>
                      <p>{style.description}</p>
                      <span className={styles.yardage}>Recommended: {style.recommended_yards} yards</span>
                      {isSelected && <div className={styles.selectedBadge}>Selected</div>}
                    </div>
                  );
                })}
                <div 
                  className={`${styles.styleOption} ${styles.addCustomOption}`}
                  onClick={() => setShowCustomForm(true)}
                >
                  <div className={styles.addIcon}>+</div>
                  <h4>Add Custom Style</h4>
                  <p>Create a custom style option for your design</p>
                </div>
              </div>
            ) : (
              <div className={styles.noSavedStyles}>
                <p>You haven't saved any custom styles yet.</p>
                <button 
                  className={styles.createStyleButton}
                  onClick={() => setShowCustomForm(true)}
                >
                  Create Your First Custom Style
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCustomForm && (
        <div className={styles.customStyleForm}>
          <h3>Create Custom Style</h3>
          <div className={styles.formFields}>
            <div className={styles.formField}>
              <label htmlFor="display_name">Style Name *</label>
              <input
                id="display_name"
                type="text"
                value={customStyle.display_name}
                onChange={(e) => handleCustomStyleChange('display_name', e.target.value)}
                placeholder="e.g. Modern Streetwear"
                required
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={customStyle.description || ''}
                onChange={(e) => handleCustomStyleChange('description', e.target.value)}
                placeholder="Describe the style..."
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="recommended_yards">Recommended Yards *</label>
              <input
                id="recommended_yards"
                type="number"
                min="1"
                step="0.5"
                value={customStyle.recommended_yards}
                onChange={(e) => handleCustomStyleChange('recommended_yards', parseFloat(e.target.value))}
                required
              />
            </div>
            <div className={styles.saveForReuseOption}>
              <input
                type="checkbox"
                id="save_for_reuse"
                checked={saveForReuse}
                onChange={() => setSaveForReuse(!saveForReuse)}
              />
              <label htmlFor="save_for_reuse">
                <FiSave className={styles.saveIcon} />
                Save this style for reuse in other designs
              </label>
            </div>
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setShowCustomForm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddCustomStyle}
            >
              Add Style
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 