import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import getObjectFields from '@salesforce/apex/usf.FieldSelectorController.getObjectFields';

const CLASSES = {
    PREFIX: '.',
    DROPDOWN_TRIGGER: 'slds-dropdown-trigger',
    IS_OPEN: 'slds-is-open',
}

const LIGHTNING = {
    INPUT: 'lightning-input'
}

const DATA_TYPE_ICONS = {
    Address: 'utility:location',
    Boolean: 'utility:check',
    ComboBox: 'utility:picklist_type',
    Currency: 'utility:currency',
    Date: 'utility:date_input',
    DateTime: 'utility:date_time',
    Double: 'utility:number_input',
    Email: 'utility:email',
    Int: 'utility:number_input',
    Location: 'utility:location',
    MultiPicklist: 'utility:multi_picklist',
    Percent: 'utility:percent',
    Phone: 'utility:phone_portrait',
    Picklist: 'utility:picklist_type',
    Reference: 'utility:record_lookup',
    Time: 'utility:date_time',
    Url: 'utility:link'
}
const DEFAULT_ICON = 'utility:text';


export default class FieldSelector extends LightningElement {
    @api objectName;
    @api publicStyle;
    @api label = 'Select Fields';
    @api hidePills;
    @api required;
    @api name;
    @api allowMultiselect;

    @api placeholder;

    @api
    get selectedFields() {
        return this._selectedFields;
    }
    set selectedFields(fields) {
        this._selectedFields = this.shallowCloneArray(fields) || [];
        this.filterOptions();
    }
    
    @api
    get selectedField() {
        return this.selectedFields.length ? this.selectedFields[0] : null;
    }
    set selectedField(value) {
        this.selectedFields = value ? [value] : [];
    }

    @api
    get selectedValue() {
        // return (this.selectedField && this.selectedField.name) ? this.selectedField.name : null;
        return this.selectedField && this.selectedField.name;
    }

    @api
    get selectedValues() {
        return this.selectedFields.map(field => field.name);
    }

    @api preselectedValuesString;

    @api
    reportValidity() {
        if (!this.required)
            return true;
        let errorMessage = '';
        if (!this.selectedFields.length) {
            errorMessage = 'Please select at least one field.'
        } else {
            this.inputElement.value = ' ';  // used to still display the 'required' asterisk when required but not cause an error on an empty text box
        }
        this.inputElement.setCustomValidity(errorMessage);
        return this.inputElement.reportValidity();
    }

    @track fields = [];
    @track _selectedFields = [];
    errorMessage;
    isLoading;
    noMatchString = 'No matches found';
    objectChangeCount = 0;
    isNotFirstObjectLoad;

    // @wire(getObjectInfo, {objectApiName: '$objectName'})
    // handleGetObjectInfo({error, data}) {
    //     this.isLoading = true;

    //     if (this.isNotFirstObjectLoad) {
    //         this.selectedFields = [];
    //         this.dispatchFields();
    //     } else {
    //         this.isNotFirstObjectLoad = true;
    //     }

    //     if (error) {
    //         this.errors = 'Unknown error';
    //         if (Array.isArray(error.body)) {
    //             this.error = error.body.map(e => e.message).join(', ');
    //         } else if (typeof error.body.message === 'string') {
    //             this.error = error.body.message;
    //         }
    //     } else if (data) {
    //         this.fields = Object.values(data.fields).map(field => {                
    //             return {
    //                 label: field.label,
    //                 sublabel: field.apiName,
    //                 value: field.apiName,
    //                 icon: this.hideIcons ? null : (DATA_TYPE_ICONS[field.dataType] || DEFAULT_ICON)
    //             }
    //         });
    //         this.fields.sort((a, b) => {
    //             return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : -1;
    //         });
    //         // if (this.preselectedValuesString) {
    //         //     console.log('preselectedValuesString = '+ this.preselectedValuesString);
    //         //     this.setFieldsFromString(this.preselectedValuesString);
    //         // }
    //     }
    //     this.isLoading = false;
    // }

    @wire(getObjectFields, { objectName: '$objectName' })
    handleGetObjectFields({ error, data }) {
        if (!this.objectName) {
            this.placeholder = 'Select an object first'
            this.isLoading = false;
            return;
        }
        this.placeholder = null;
        this.isLoading = true;
        this.fields = [];
        // If the object is changed from the original value, clear any pre-selected fields
        if (this.objectChangeCount > 0) {
            this.selectedFields = [];
            this.dispatchFields();
        }
        this.errorMessage = null;
        if (error) {
            console.log('Error: ' + error.body.message);
            this.errorMessage = error.body.message;
        }
        if (data) {
            this.fields = this.shallowCloneArray(data);
            this.fields.sort((a, b) => {
                return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : -1;
            });
            this.objectChangeCount++;

            if (this.preselectedValuesString) {
                // console.log('preselectedValuesString = '+ this.preselectedValuesString);
                let preselectedFields = [];
                for (let value of this.preselectedValuesString.split(',')) {
                    value = value.trim();
                    let matchingField = this.fields.find(field => field.name === value);
                    if (matchingField) {
                        preselectedFields.push(matchingField);
                    }
                }        
                this.selectedFields = preselectedFields;
            }
        }
        this.isLoading = false;
    }

    connectedCallback() {
        if (this.objectName)
            this.isLoading = true;
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
            label += ' (' + this.selectedFields.length + ')';
        return label;
    }

    get isInputDisabled() {
        return !this.objectName || this.isLoading;
    }

    get noMatchFound() {
        return this.fields.every(field => field.hidden);
    }

    get showSelectedValue() {
        return !this.allowMultiselect && this.selectedValue;
    }

    get showPills() {
        return this.allowMultiselect && !this.hidePills && this.selectedFields.length;
    }

    /* ACTION FUNCTIONS */
    showList() {
        this.dropdownTrigger.classList.add(CLASSES.IS_OPEN);
    }

    hideList() {
        this.dropdownTrigger.classList.remove(CLASSES.IS_OPEN);
    }

    filterOptions(searchText) {
        if (!searchText)
            searchText = '';
        console.log('in filterOptions, searchText = '+ searchText);
        searchText = searchText.toLowerCase();
        for (let field of this.fields) {
            if (this.selectedFields.some(el => el.name === field.name))
                field.hidden = true;
            else {
                if (field.name.toLowerCase().includes(searchText) || field.label.toLowerCase().includes(searchText)) {
                    field.hidden = false;
                } else {
                    field.hidden = true;
                }
            }
        }
        console.log('finished filterOptions');
    }

    setFieldsFromString(fieldNameString) {
        let fieldNames = fieldNameString.split(',');
        this.selectedFields = this.fields.filter(field => fieldNames.includes(field.value));
        console.log('selectedFields = '+ JSON.stringify(this.selectedFields));
    }

    dispatchFields() {
        this.dispatchEvent(new CustomEvent('fieldupdate', { detail: { 
            value: this.selectedValue,
            values: this.selectedValues
        } }));
    }

    /* EVENT HANDLERS */
    handleSearchChange() {
        this.filterOptions(this.inputElement.value);
    }

    handleSearchFocus(event) {
        this.filterOptions(this.inputElement.value);
        this.showList();
    }

    handleSearchBlur(event) {
        this.hideList();
        this.reportValidity();
    }

    handleFieldSelect(event) {
        let selectedIndex = event.currentTarget.dataset.index;
        if (this.allowMultiselect) {
            this.selectedFields.push(this.fields[selectedIndex]);
            this.inputElement.value = null;
        } else {
            this.selectedFields = [this.fields[selectedIndex]];
        }
        this.dispatchFields();
    }

    handleFieldUnselect(event) {
        this.selectedFields.splice(event.currentTarget.dataset.index, 1);
        this.dispatchFields();
    }

    handleClearClick(event) {
        console.log('in handleClearClick');
        this.selectedFields = [];
        this.dispatchFields();
        // These don't work, I think because the input hasn't rerendered yet
        // this.filterOptions();
        // this.showList();
    }

    /* UTILITY FUNCTIONS */
    shallowCloneArray(arrayToClone) {
        if (!Array.isArray(arrayToClone))
            return null;

        let newArray = [];
        for (let el of arrayToClone) {
            newArray.push(Object.assign({}, el));
        }
        return newArray;
    }
}