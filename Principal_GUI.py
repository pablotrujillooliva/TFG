import tkinter as tk
from tkinter import filedialog, messagebox
from tkinter import ttk
from PIL import Image, ImageTk
import os
import glob
import Principal

class RDFApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Generador de RDF, de esqeuma y de datos")
        self.root.geometry("800x600")  # Aumenta el tamaño de la ventana

        self.notebook = ttk.Notebook(root)
        self.notebook.pack(expand=1, fill='both')

        self.frame1 = ttk.Frame(self.notebook)
        self.frame2 = ttk.Frame(self.notebook)
        self.frame3 = ttk.Frame(self.notebook)

        self.notebook.add(self.frame1, text='Generar RDF')
        self.notebook.add(self.frame2, text='Ver Imagen')
        self.notebook.add(self.frame3, text='Ver TTL')

        self.label = tk.Label(self.frame1, text="Base de datos:")
        self.label.pack(pady=5)

        self.db_path = tk.Entry(self.frame1, width=60)
        self.db_path.pack(pady=5)

        self.browse_button = tk.Button(self.frame1, text="Browse", command=self.browse_file)
        self.browse_button.pack(pady=5)

        self.generate_button = tk.Button(self.frame1, text="Generate RDF", command=self.generate_rdf)
        self.generate_button.pack(pady=20)

        self.borrar_button = tk.Button(self.frame1, text="Borrar documentos", command=self.borrar_docs)
        self.borrar_button.pack(pady=10)  # Ajusta el padding para que se vea mejor

        # Crear un Canvas con barras de desplazamiento para la imagen
        self.canvas = tk.Canvas(self.frame2, bg='white')
        self.canvas.pack(side=tk.LEFT, expand=True, fill=tk.BOTH)

        self.scroll_x = tk.Scrollbar(self.frame2, orient=tk.HORIZONTAL, command=self.canvas.xview)
        self.scroll_x.pack(side=tk.BOTTOM, fill=tk.X)
        self.scroll_y = tk.Scrollbar(self.frame2, orient=tk.VERTICAL, command=self.canvas.yview)
        self.scroll_y.pack(side=tk.RIGHT, fill=tk.Y)

        self.canvas.configure(xscrollcommand=self.scroll_x.set, yscrollcommand=self.scroll_y.set)
        self.canvas.bind("<ButtonPress-1>", self.start_pan)
        self.canvas.bind("<B1-Motion>", self.pan)

        self.image_id = None
        self.image = None
        self.original_image = None

        # Crear widgets para mostrar el contenido del archivo TTL
        self.ttl_text = tk.Text(self.frame3, wrap=tk.NONE)
        self.ttl_text.pack(expand=1, fill='both')

        self.ttl_scroll_x = tk.Scrollbar(self.frame3, orient=tk.HORIZONTAL, command=self.ttl_text.xview)
        self.ttl_scroll_x.pack(side=tk.BOTTOM, fill=tk.X)
        self.ttl_scroll_y = tk.Scrollbar(self.frame3, orient=tk.VERTICAL, command=self.ttl_text.yview)
        self.ttl_scroll_y.pack(side=tk.RIGHT, fill=tk.Y)

        self.ttl_text.configure(xscrollcommand=self.ttl_scroll_x.set, yscrollcommand=self.ttl_scroll_y.set)

        self.ttl_combobox = ttk.Combobox(self.frame3)
        self.ttl_combobox.pack(pady=5)
        self.ttl_combobox.bind("<<ComboboxSelected>>", self.load_selected_ttl)

        self.generated_ttl_files = []

    def browse_file(self):
        file_path = filedialog.askopenfilename(filetypes=[("Database Files", "*.db")])
        if file_path:
            self.db_path.insert(0, file_path)

    def generate_rdf(self):
        base_datos = self.db_path.get()
        if not base_datos:
            messagebox.showerror("Error", "Please select a database file.")
            return

        try:
            principal = Principal.main(base_datos)
            messagebox.showinfo("Success", f"RDF generated successfully!\nOutput RDF: {principal}")
            self.show_image('rdf_graph_output_square.png')
            self.generated_ttl_files = glob.glob("*.ttl")  # Almacenar los archivos .ttl generados
            self.ttl_combobox['values'] = self.generated_ttl_files  # Actualizar el combobox con los archivos .ttl generados
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred: {e}")

    def borrar_docs(self):
        for file in glob.glob("rdf_graph_output_square.png"):
            os.remove(file)
        for file in glob.glob("*.ttl"):
            os.remove(file)
        for file in glob.glob("rdf_graph_output_square"):
            os.remove(file)
        messagebox.showinfo("Entra en borrado", "Documentos eliminados correctamente")

    def show_image(self, image_path):
        if os.path.exists(image_path):
            self.original_image = Image.open(image_path)
            self.image = ImageTk.PhotoImage(self.original_image)
            if self.image_id:
                self.canvas.delete(self.image_id)
            self.image_id = self.canvas.create_image(0, 0, anchor=tk.NW, image=self.image)
            self.canvas.config(scrollregion=self.canvas.bbox(tk.ALL))
        else:
            messagebox.showerror("Error", "Image file not found.")

    def load_selected_ttl(self, event):
        selected_file = self.ttl_combobox.get()
        if selected_file:
            with open(selected_file, 'r', encoding='utf-8') as file:
                content = file.read()
                self.ttl_text.delete(1.0, tk.END)
                self.ttl_text.insert(tk.END, content)

    def start_pan(self, event):
        self.canvas.scan_mark(event.x, event.y)

    def pan(self, event):
        self.canvas.scan_dragto(event.x, event.y, gain=1)

if __name__ == "__main__":
    root = tk.Tk()
    app = RDFApp(root)
    root.mainloop()