import { LightningElement, api, track } from 'lwc';

const CLASSES = {
    PREFIX: '.',
    DROPDOWN_TRIGGER: 'slds-dropdown-trigger',
    IS_OPEN: 'slds-is-open',
    OPTION_BASE: 'slds-media slds-listbox__option slds-listbox__option_entity',
    OPTION_METADATA: 'slds-listbox__option_has-meta'
}

const LIGHTNING = {
    INPUT: 'lightning-input'
}

export default class OptionSelector extends LightningElement {
    @api publicStyle;
    @api publicClass;
    @api label;
    @api hidePills;
    @api name;
    
    @api messageWhenValueMissing = 'Please select at least one option.';
    @api placeholder;
    @api required = false;
    @api disabled = false;
    @api allowMultiselect = false;
    @api includeSublabelInFilter = false;   // If true, the 'sublabel' text of an option is included when determining if an option is a match for a given search text. Default is false.
    @api excludeValueInFilter = false;  // If true, the 'value' text of an option is not included when determining if an option is a match for a given search text. Default is false.
    @api hideSelectedValues = false;    // Reserved for future use

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


    @track _selectedOptions = [];
    errorMessage;
    isLoading;
    noMatchString = 'No matches found';


    connectedCallback() {
        console.log(JSON.stringify(this.options));
    }

    get dropdownTrigger() {
        return this.template.querySelector(CLASSES.PREFIX + CLASSES.DROPDOWN_TRIGGER) || {};
    }

    get inputElement() {
        return this.template.querySelector(LIGHTNING.INPUT);
    }

    get searchLabelCounter() {
        let label = this.label;
        if (this.allowMultiselect)
            label += ' (' + this.selectedOptions.length + ')';
        return label;
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

    get showPills() {
        return this.allowMultiselect && !this.hidePills && this.selectedOptions.length;
    }

    get optionClass() {
        return CLASSES.OPTION_BASE;
        let classString = CLASSES.OPTION_BASE;
        if (this.hasSublabels) {
            classString += ' ' + CLASSES.OPTION_METADATA
        }
        return classString;
    }

    /* ACTION FUNCTIONS */
    showList() {
        this.dropdownTrigger.classList.add(CLASSES.IS_OPEN);
    }

    hideList() {
        this.dropdownTrigger.classList.remove(CLASSES.IS_OPEN);
    }

    filterOptions(searchText = '') {
        console.log('in filterOptions, searchText = ' + searchText);
        searchText = searchText.toLowerCase();
        console.log('lowercase searchtext = ' + searchText);
        for (let option of this.options) {
            // if (this.hideSelectedValues && this.values.includes(option.value)) {
            if (this.values.includes(option.value)) {
                option.hidden = true;
            }
            else {
                if (option.label.toLowerCase().includes(searchText)
                    || (!this.excludeValueInFilter && option.value.toLowerCase().includes(searchText))
                    || (this.includeSublabelInFilter && option.sublabel && option.sublabel.toLowerCase().includes(searchText))) {
                    option.hidden = false;
                } else {
                    option.hidden = true;
                }
            }
        }
        console.log('options after filtering = '+ JSON.stringify(this.options));
        console.log('finished filterOptions');
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
        this.dispatchEvent(new CustomEvent('change', {
            detail: detail
            // detail: {
            //     value: this.value,
            //     values: this.values,
            //     selectedOption: this.selectedOption,
            //     selectedOptions: this.selectedOptions
            // }
        }));
    }

    /* EVENT HANDLERS */
    handleSearchChange() {
        this.filterOptions(this.inputElement.value);
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
        console.log('in handleOptionUnselect, '+ event.target.dataset.index);
        this.values.splice(event.target.dataset.index, 1);
        this.dispatchOptions();
    }

    handleClearClick(event) {
        this.values = [];
        this.dispatchOptions();
    }

}