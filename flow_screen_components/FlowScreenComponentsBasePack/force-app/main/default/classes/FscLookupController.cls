public with sharing class FscLookupController {
    
    @AuraEnabled
    public static List<SObject> search(String searchTerm, String objectName, String fieldsToSearch, String fieldsToReturn, Integer numRecordsToReturn, String whereClause, String orderByClause) {
        System.debug('in search: searchTerm='+ searchTerm +'. objectName='+ objectName +'. fieldsToSearch='+ fieldsToSearch +'. fieldsToReturn='+ fieldsToReturn +'. numRecordsToReturn='+ numRecordsToReturn +'.');
        List<SObject> returnRecords = new List<SObject>();
        Map<String, Schema.SObjectField> fieldMap = getFieldMap(objectName);
        String objectNameField = getNameField(objectName);
        String searchFieldString;
        if (!String.isBlank(searchTerm)) {
            if (String.isBlank(fieldsToSearch)) {
                fieldsToSearch = objectNameField;
            } else if (fieldsToSearch.toLowerCase() == 'all') {
                // TODO: more exhaustive list of valid operators for different field data types
                /*
                List<String> fieldNames = new List<String>(fieldMap.keySet());
                fieldNames.remove(fieldNames.indexOf('id'));
                fieldsToSearch = String.join(fieldNames, ',');
                // fieldsToSearch.replace(',Id,',','); // Like operator cannot be performed on ID
                */
            }

            List<String> searchFieldList = new List<String>();
            for (String searchField : splitAndTrim(fieldsToSearch)) {
                if (fieldMap.get(searchField).getDescribe().getType().name() == 'String')
                    searchFieldList.add(searchField +' LIKE \'%'+ searchTerm +'%\'');
                // else 
                    // searchFieldList.add(searchField +' = \''+ searchTerm +'\'');
            }
            searchFieldString = String.join(searchFieldList, ' OR ');
        }

        if (String.isBlank(fieldsToReturn)) {
            // fieldsToReturn = 'Id, '+ objectNameField;
            fieldsToReturn = objectNameField;
        }

        String queryString = 'SELECT '+ fieldsToReturn +' FROM '+ objectName;
        Integer whereComponents = (String.isBlank(whereClause) ? 0 : 1) + (String.isBlank(searchFieldString) ? 0 : 1);
        if (!String.isBlank(whereClause) || !String.isBlank(searchFieldString)) {
            queryString +=' WHERE ';
            if (!String.isBlank(whereClause) && !String.isBlank(searchFieldString)) {
                queryString += '('+ searchFieldString +') AND ('+ whereClause +')';
            } else {
                queryString += String.isBlank(searchFieldString) ? whereClause : searchFieldString;
            }
        }
        if (!String.isBlank(orderByClause)) {
            queryString += ' ORDER BY '+ orderByClause;
        }
        if (numRecordsToReturn > 0) {
            queryString += ' LIMIT '+ numRecordsToReturn;
        }
        System.debug('queryString = '+ queryString);
        returnRecords = Database.query(queryString);
        return returnRecords;
    }

    @AuraEnabled(cacheable=true)
    public static List<SObject> getRecentlyViewed(String objectName, String fieldsToReturn, Integer numRecordsToReturn){
        try {
            if (!(numRecordsToReturn > 0)) {
                numRecordsToReturn = 5;
            }
            List<RecentlyViewed> recentViews = search(null, 'RecentlyViewed', null, 'Id', numRecordsToReturn, 'Type = \''+ objectName +'\'', 'LastReferencedDate DESC');
            List<String> recordIds = new List<String>();
            for (RecentlyViewed recentView : recentViews) {
                recordIds.add('\''+ recentView.Id +'\'');
            }
            return search(null, objectName, null, fieldsToReturn, numRecordsToReturn, 'Id IN ('+ String.join(recordIds, ',') +')', 'LastReferencedDate DESC');
        } catch (Exception e) {
            return null;
        }
    }

    public static List<String> splitAndTrim(String inputString) {
        return splitAndTrim(inputString, ',');
    }

    public static List<String> splitAndTrim(String inputString, String delimiter) {
        List<String> splitStrings = inputString.split(delimiter);
        for (String splitString : splitStrings) {
            splitString = splitString.trim();
        }
        return splitStrings;
    }

    public static Map<String, Schema.SObjectField> getFieldMap(String objectName) {
        return ((SObject)(Type.forName('Schema.'+objectName).newInstance())).getSObjectType().getDescribe().fields.getMap();
    }

    public static String getNameField(String objectName) {
        Map<String, Schema.SObjectField> fieldMap = getFieldMap(objectName);
        if (fieldMap.containsKey('Name') && fieldMap.get('Name').getDescribe().IsNameField()) {
            return 'Name';
        }
        for (String fieldName : fieldMap.keySet()) {
            Schema.DescribeFieldResult fieldResult = fieldMap.get(fieldName).getDescribe();
            if (fieldResult.IsNameField()) {
                return fieldResult.getName();
            }
        }
        return null;
    }
}
