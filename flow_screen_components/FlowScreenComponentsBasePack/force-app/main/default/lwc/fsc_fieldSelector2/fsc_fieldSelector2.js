import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

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

export default class Fsc_fieldSelector2 extends LightningElement {
    @api objectName;
    @api allowMultiselect;
    @api required;
    @api label = 'Select Field';
    @api publicClass;
    @api publicStyle;
    @api hideIcons = false;
    @track fields = [];

    @api
    get values() {
        return this._values || [];
    }
    set values(values) {
        if (!values) {
            this._values = [];
        } else {
            this._values = Array.isArray(values) ? values : [values];
        }
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
    get selectedFields() {
        let fields = [];
        for (let value of this.values) {
            fields.push(this.fields.find(field => field.value === value));
        }
        return fields;
    }

    @api
    get selectedField() {
        return this.selectedFields.length ? this.selectedFields[0] : null;
    }

    isNotFirstObjectLoad;
    isLoading;

    @wire(getObjectInfo, {objectApiName: '$objectName'})
    handleGetObjectInfo({error, data}) {
        this.isLoading = true;

        if (this.isNotFirstObjectLoad) {
            this.selectedFields = [];
            this.dispatchFields();
        } else {
            this.isNotFirstObjectLoad = true;
        }

        if (error) {
            this.errors = 'Unknown error';
            if (Array.isArray(error.body)) {
                this.error = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                this.error = error.body.message;
            }
        } else if (data) {
            this.fields = Object.values(data.fields).map(field => {                
                return {
                    label: field.label,
                    sublabel: field.apiName,
                    value: field.apiName,
                    icon: this.hideIcons ? null : (DATA_TYPE_ICONS[field.dataType] || DEFAULT_ICON)
                }
            });
            this.fields.sort((a, b) => {
                return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : -1;
            });
            if (this.preselectedValuesString) {
                this.setFieldsFromString(this.preselectedValuesString);
            }
        }
        this.isLoading = false;
    }

    handleComboboxChange(event) {
        if (this.allowMultiselect) {
            this.values = event.detail.values;    
        } else {
            this.value = event.detail.value;
        }
        this.dispatchFields();
    }

    dispatchFields() {
        console.log('in dispatchFields');
        let detail;
        if (this.allowMultiselect) {
            detail = {
                values: this.values,
                selectedFields: this.selectedFields
            }
        } else {
            detail = {
                value: this.value,
                selectedField: this.selectedField
            }
        }
        console.log('about to dispatch, '+ JSON.stringify(detail));
        this.dispatchEvent(new CustomEvent('fieldchange', { detail: detail }));
    }
}