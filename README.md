# TTM4115_PowerRangers
Repository for Group 12 in TTM4115, Spring 2022

## Cloning into the repository
1. Generate a [Personal Access Token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token). *IMPORTANT: Remember to copy and write down the access token as soon as you see it, once you click away you can never see it again*. 
2. Click on the green button called "Code", and choose HTTPS. Copy the link, and type "git clone <link>" (replacing <link> with the link you copied) in a terminal (Powershell/Git Bash for Windows, Terminal for MacOS or Linux).
3. You will be prompted for your Github username and password. For the username, you write the username you use on Github. For the password, copy the access token you wrote down in step 1, and paste this.
4. You should now get have successfully cloned the Github repository, and are able to create branches, push changes and check out other people's branches.


## Git commit guidelines
Whenever you have completed a subtask of an Issue, you should commit your changes. This way, if you make a change that makes the code unrunnable, you can easily revert to a commit where everything was working.
To commit, you must stage all the changes you have made.
1. First write *git status* in your terminal (Git Bash works well on Windows) and identify which files have been changed. (Optionally, you can look through the changes in these files one more time before committing them, which often eliminates trivial mistakes and errors)
2. Stage all the changes by writing *git add <filename>* replacing <filenames> with the filename of a file that has been changed. 
3. When all the changed files have been staged, write *git commit -m "#<issue number> <commit message>"*. The commit message should tell someone reading through the log something about what was changed or added in the commit. As common practice, the commit message should not be written in present tense, rather like "#123 Add logging in backend service" or "#20 Improve color palette for buttons".
4. After committing, you can push the changes to Github by writing *git push*.
