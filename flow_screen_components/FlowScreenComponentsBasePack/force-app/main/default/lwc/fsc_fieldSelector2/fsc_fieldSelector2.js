import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class Fsc_fieldSelector2 extends LightningElement {
    @api objectName;
    @api allowMultiSelect;
    @api required;
    @api label;
    @track fields = [];

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
                    value: field.apiName
                }
            });
            if (this.preselectedValuesString) {
                this.setFieldsFromString(this.preselectedValuesString);
            }
        }
        this.isLoading = false;
    }

    handleComboboxChange(event) {
        console.log('in handleComboboxChange');
        console.log(JSON.stringify(event.detail));
    }

    dispatchFields() {
        console.log('in dispatch fields');
    }
}