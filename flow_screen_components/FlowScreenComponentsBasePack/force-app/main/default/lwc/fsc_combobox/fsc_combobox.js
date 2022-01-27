import { LightningElement, api, track } from 'lwc';

const CLASSES = {
    PREFIX: '.',
    DROPDOWN_TRIGGER: 'slds-dropdown-trigger',
    IS_OPEN: 'slds-is-open'
}

const LIGHTNING = {
    INPUT: 'lightning-input'
}

export default class OptionSelector extends LightningElement {
    @api publicStyle;
    @api publicClass;
    @api label;
    @api name;
    @api customSearchHandler;   // Custom function to be executed by handleSearchChange, passed in from a parent component.
    
    @api messageWhenValueMissing = 'Please select at least one option.';
    @api iconSize = 'small'
    @api placeholder = 'Select an option';
    @api noMatchString = 'No matches found';
    @api required = false;
    @api disabled = false;
    @api allowMultiselect = false;
    @api hidePills = false; // If true, list of selected pills in multiselect mode will not be displayed (generally because a parent component wants to display them differently).
    @api excludeSublabelInFilter = false;   // If true, the 'sublabel' text of an option is included when determining if an option is a match for a given search text.
    @api includeValueInFilter = false;  // If true, the 'value' text of an option is not included when determining if an option is a match for a given search text.
    @api hideSelectedValues = false;    // Reserved for future use

    @api
    get debounceDelay() {
        return this._debounceDelay;
    }
    set debounceDelay(delay) {
        this._debounceDelay = parseInt(delay) || 0;
    }
    _debounceDelay = 0;

    @api 
    get options() {
        return this._options || [];
    }
    set options(options) {
        this._options = options.map(option => Object.assign({}, option));   // Shallow clone of array for mutability
    }
    @track _options = [];

    @api
    get values() {
        return this._values || [];
    }
    set values(values) {
        this._values = Array.isArray(values) ? values : [values];
    }
    @track _values = [];

    @api
    get value() {
        return this.values.length ? this.values[0] : null;
    }
    set value(value) {
        this.values = value ? [value] : [];
    }

    @api
    get selectedOptions() {
        let options = [];
        for (let value of this.values) {
            options.push(this.options.find(option => option.value === value));
        }
        return options;
    }

    @api
    get selectedOption() {
        return this.selectedOptions.length ? this.selectedOptions[0] : null;
    }

    @api
    reportValidity() {
        if (!this.required)
            return true;
        let errorMessage = '';
        if (!this.selectedOptions.length) {
            errorMessage = this.messageWhenValueMissing
        } else {
            this.inputElement.value = ' ';  // used to still display the 'required' asterisk when required but not cause an error on an empty text box
        }
        this.inputElement.setCustomValidity(errorMessage);
        return this.inputElement.reportValidity();
    }

    get valuesString() {
        return JSON.stringify(this.values);
    }

    // @track _selectedOptions = [];
    errorMessage;
    isLoading;
    debounceTimer;    

    connectedCallback() {
        // console.log(JSON.stringify(this.options));
        console.log('in combobox, debouncedelay = '+ this.debounceDelay, Number.isInteger(this.debounceDelay));
    }

    get dropdownTrigger() {
        return this.template.querySelector(CLASSES.PREFIX + CLASSES.DROPDOWN_TRIGGER) || {};
    }

    get inputElement() {
        return this.template.querySelector(LIGHTNING.INPUT);
    }

    get isInputDisabled() {
        return this.disabled || this.isLoading;
    }

    get noMatchFound() {
        return this.options.every(option => option.hidden);
    }

    get showSelectedValue() {
        return !this.allowMultiselect && this.value;
    }

    get selectedValueClass() {
        return 'slds-combobox__form-element slds-input-has-icon ' + (this.selectedOption.icon ? 'slds-input-has-icon_left-right' : 'slds-input-has-icon_right');
    }

    get showPills() {
        return this.allowMultiselect && !this.hidePills && this.values.length;
    }

    /* ACTION FUNCTIONS */
    showList() {
        this.dropdownTrigger.classList.add(CLASSES.IS_OPEN);
    }

    hideList() {
        this.dropdownTrigger.classList.remove(CLASSES.IS_OPEN);
    }

    filterOptions(searchText = '') {
        searchText = searchText.toLowerCase();
        for (let option of this.options) {
            // if (this.hideSelectedValues && this.values.includes(option.value)) {
            if (this.values.includes(option.value)) {
                option.hidden = true;
            }
            else {
                if (option.label.toLowerCase().includes(searchText)
                    || (this.includeValueInFilter && option.value.toLowerCase().includes(searchText))
                    || (!this.excludeSublabelInFilter && option.sublabel && option.sublabel.toLowerCase().includes(searchText))) {
                    option.hidden = false;

                } else {
                    option.hidden = true;
                }
            }
        }
    }

    dispatchOptions() {
        let detail;
        if (this.allowMultiselect) {
            detail = {
                values: this.values,
                selectedOptions: this.selectedOptions
            }
        } else {
            detail = {
                value: this.value,
                selectedOption: this.selectedOption
            }
        }
        this.dispatchEvent(new CustomEvent('valuechange', { detail: detail }));
    }

    /* EVENT HANDLERS */
    handleSearchChange(event) {        
        // console.log('in handleSearchChange');
        // console.log('customSearchHandler = '+ this.customSearchHandler);
        // console.log(JSON.stringify(this.customSearchHandler));
        this.debounce(
            () => this.customSearchHandler ? this.customSearchHandler(this.inputElement.value) : this.filterOptions(this.inputElement.value),
            // parseInt(this.debounceDelay, 10)
            this.debounceDelay
        );
    }

    handleSearchFocus(event) {
        if (this.inputElement.value === ' ') {
            this.inputElement.value = '';
        }
        this.filterOptions(this.inputElement.value);
        this.showList();
    }

    handleSearchBlur(event) {
        this.hideList();
        this.reportValidity();
    }

    handleOptionSelect(event) {
        let selectedIndex = event.currentTarget.dataset.index;
        if (this.allowMultiselect) {
            this.values.push(this.options[selectedIndex].value);
            this.inputElement.value = null;
        } else {
            this.value = this.options[selectedIndex].value;
        }
        this.dispatchOptions();
    }

    handleOptionUnselect(event) {
        this.values.splice(event.target.dataset.index, 1);
        this.dispatchOptions();
    }

    handleClearClick(event) {
        this.values = [];
        this.dispatchOptions();
    }

    /* UTILITY FUNCTIONS */
    debounce(fn, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(fn, wait);      
    }
}