# Usage   

List Directory: GET `/list?path=my_folder`   

Read File: GET `/read?path=folder/note.txt`   

Create/Update File: POST `/write with JSON body`:   

```json
{ "path": "test.txt", "content": "Hello World!" }
```

Use code with caution.   

Delete File: DELETE `/delete?path=test.txt` 