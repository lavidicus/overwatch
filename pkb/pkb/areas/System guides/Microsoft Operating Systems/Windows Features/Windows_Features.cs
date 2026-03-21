##########################################################################
# File name: /cots/Microsoft Windows/PS/Windows_Features.exe
# File version: 23073001
# File description: The script will display and allow the user to remove
# Windows Features and software from the target machine.
##########################################################################
# Change log: Number, Date, (Release/Version), Comment
# 1.  [3/14/23] Rel.1.0: Initial code development
# 2.  -
# 3.  -
##########################################################################

# { Section X} - [Title]
##########################################################################
using System;
using System.Windows.Forms;

namespace WindowsFeaturesApp
{
    public class WindowsFeaturesForm : Form
    {
        // Define the Windows_Features function
        private void Windows_Features()
        {
            // Get a list of all installed Windows features
            var features = Microsoft.Windows.ServerManager.LocalServer.GetFeatures();

            // Loop through the list of features and output the names of the installed features
            foreach (var feature in features)
            {
                if (feature.Installed)
                {
                    listBox.Items.Add(feature.Name);
                }
            }

            // Display a message indicating that the function has completed
            Console.WriteLine("List of installed Windows features has been generated.");
        }

        // Define the GUI form
        private ListBox listBox;
        private Button button1;
        private Button button2;

        public WindowsFeaturesForm()
        {
            Text = "Windows Features";
            Width = 300;
            Height = 200;
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.Fixed3D;
            MaximizeBox = false;
            MinimizeBox = false;

            // Define the list box control
            listBox = new ListBox();
            listBox.Location = new System.Drawing.Point(10, 10);
            listBox.Size = new System.Drawing.Size(260, 100);
            listBox.SelectionMode = SelectionMode.None;
            Controls.Add(listBox);

            // Define the menu options
            var menuOptions = new[]
            {
                new { Key = 1, Value = "List installed Windows features" },
                new { Key = 0, Value = "Exit" }
            };

            // Define the button control for each menu option
            for (int i = 0; i < menuOptions.Length; i++)
            {
                var button = new Button();
                button.Text = menuOptions[i].Value;
                button.Location = new System.Drawing.Point(10 + i * 130, 120);
                button.Size = new System.Drawing.Size(120, 30);
                Controls.Add(button);

                if (menuOptions[i].Key == 1)
                {
                    button1 = button;
                    button1.Click += new EventHandler(button1_Click);
                }
                else if (menuOptions[i].Key == 0)
                {
                    button2 = button;
                    button2.Click += new EventHandler(button2_Click);
                }
            }
        }

        private void button1_Click(object sender, EventArgs e)
        {
            // Call the Windows_Features function
            Windows_Features();
        }

        private void button2_Click(object sender, EventArgs e)
        {
            // Close the GUI form and exit the application
            Close();
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new WindowsFeaturesForm());
        }
    }
}



##########################################################################