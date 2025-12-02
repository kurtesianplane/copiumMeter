import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import pandas as pd
import os
import random

class AnnotationTool:
    def __init__(self, root):
        self.root = root
        self.root.title("CopiumMeter - Annotation Tool")
        self.root.geometry("800x600")
        self.root.configure(bg="#1a1a2e")
        
        # Data
        self.df = None
        self.current_index = 0
        self.annotations = []
        self.samples = []
        
        # Labels
        self.label_map = {
            0: ("Copium 💀", "#ff6b6b", "Denial, coping, dismissive self-soothing"),
            1: ("Sarcastic 🙃", "#ffd93d", "Irony, mocking, exaggerated statements"),
            2: ("Sincere 😌", "#6bcb77", "Genuine, honest, appreciative"),
            3: ("Neutral 😐", "#4d96ff", "Factual, informational, no emotion")
        }
        
        self.setup_ui()
        
    def setup_ui(self):
        # Title
        title_frame = tk.Frame(self.root, bg="#1a1a2e")
        title_frame.pack(pady=20)
        
        title = tk.Label(
            title_frame, 
            text="🧪 CopiumMeter Annotation Tool",
            font=("Segoe UI", 24, "bold"),
            fg="#ffffff",
            bg="#1a1a2e"
        )
        title.pack()
        
        subtitle = tk.Label(
            title_frame,
            text="Manually annotate text samples for training",
            font=("Segoe UI", 12),
            fg="#888888",
            bg="#1a1a2e"
        )
        subtitle.pack()
        
        # Top buttons frame (Load, Save, Export)
        top_buttons_frame = tk.Frame(self.root, bg="#1a1a2e")
        top_buttons_frame.pack(pady=10)
        
        self.load_btn = tk.Button(
            top_buttons_frame,
            text="📂 Load Dataset",
            font=("Segoe UI", 11),
            bg="#4d96ff",
            fg="white",
            padx=20,
            pady=10,
            cursor="hand2",
            command=self.load_dataset
        )
        self.load_btn.pack(side="left", padx=5)
        
        self.save_btn = tk.Button(
            top_buttons_frame,
            text="💾 Save",
            font=("Segoe UI", 11),
            bg="#6bcb77",
            fg="white",
            padx=20,
            pady=10,
            cursor="hand2",
            command=self.save_annotations
        )
        self.save_btn.pack(side="left", padx=5)
        
        self.export_btn = tk.Button(
            top_buttons_frame,
            text="📤 Export Dataset",
            font=("Segoe UI", 11),
            bg="#9b59b6",
            fg="white",
            padx=20,
            pady=10,
            cursor="hand2",
            command=self.export_dataset
        )
        self.export_btn.pack(side="left", padx=5)
        
        # Progress
        self.progress_var = tk.StringVar(value="No dataset loaded")
        self.progress_label = tk.Label(
            self.root,
            textvariable=self.progress_var,
            font=("Segoe UI", 10),
            fg="#888888",
            bg="#1a1a2e"
        )
        self.progress_label.pack(pady=5)
        
        # Progress bar
        self.progress_bar = ttk.Progressbar(
            self.root,
            length=400,
            mode='determinate'
        )
        self.progress_bar.pack(pady=5)
        
        # Text display
        text_frame = tk.Frame(self.root, bg="#16213e", padx=20, pady=20)
        text_frame.pack(pady=20, padx=40, fill="x")
        
        self.text_display = tk.Text(
            text_frame,
            height=6,
            font=("Segoe UI", 14),
            bg="#16213e",
            fg="#ffffff",
            wrap="word",
            relief="flat",
            state="disabled"
        )
        self.text_display.pack(fill="x")
        
        # Original label indicator
        self.original_label_var = tk.StringVar(value="")
        self.original_label = tk.Label(
            self.root,
            textvariable=self.original_label_var,
            font=("Segoe UI", 10, "italic"),
            fg="#666666",
            bg="#1a1a2e"
        )
        self.original_label.pack()
        
        # Annotation buttons
        btn_frame = tk.Frame(self.root, bg="#1a1a2e")
        btn_frame.pack(pady=20)
        
        self.annotation_btns = []
        for label_id, (label_name, color, description) in self.label_map.items():
            btn_container = tk.Frame(btn_frame, bg="#1a1a2e")
            btn_container.pack(side="left", padx=10)
            
            btn = tk.Button(
                btn_container,
                text=label_name,
                font=("Segoe UI", 12, "bold"),
                bg=color,
                fg="white" if label_id != 1 else "black",
                width=12,
                height=2,
                cursor="hand2",
                command=lambda lid=label_id: self.annotate(lid)
            )
            btn.pack()
            
            desc = tk.Label(
                btn_container,
                text=description,
                font=("Segoe UI", 8),
                fg="#888888",
                bg="#1a1a2e",
                wraplength=120
            )
            desc.pack(pady=5)
            
            self.annotation_btns.append(btn)
        
        # Navigation
        nav_frame = tk.Frame(self.root, bg="#1a1a2e")
        nav_frame.pack(pady=10)
        
        self.prev_btn = tk.Button(
            nav_frame,
            text="◀ Previous",
            font=("Segoe UI", 10),
            bg="#333333",
            fg="white",
            padx=15,
            pady=5,
            cursor="hand2",
            command=self.prev_sample
        )
        self.prev_btn.pack(side="left", padx=5)
        
        self.skip_btn = tk.Button(
            nav_frame,
            text="Skip ⏭",
            font=("Segoe UI", 10),
            bg="#666666",
            fg="white",
            padx=15,
            pady=5,
            cursor="hand2",
            command=self.skip_sample
        )
        self.skip_btn.pack(side="left", padx=5)
        
        self.next_btn = tk.Button(
            nav_frame,
            text="Next ▶",
            font=("Segoe UI", 10),
            bg="#333333",
            fg="white",
            padx=15,
            pady=5,
            cursor="hand2",
            command=self.next_sample
        )
        self.next_btn.pack(side="left", padx=5)
        
        # Stats
        stats_frame = tk.Frame(self.root, bg="#1a1a2e")
        stats_frame.pack(pady=10)
        
        self.stats_var = tk.StringVar(value="Copium: 0 | Sarcastic: 0 | Sincere: 0 | Neutral: 0")
        self.stats_label = tk.Label(
            stats_frame,
            textvariable=self.stats_var,
            font=("Segoe UI", 10),
            fg="#888888",
            bg="#1a1a2e"
        )
        self.stats_label.pack()
        
        # Keyboard bindings
        self.root.bind('1', lambda e: self.annotate(0))
        self.root.bind('2', lambda e: self.annotate(1))
        self.root.bind('3', lambda e: self.annotate(2))
        self.root.bind('4', lambda e: self.annotate(3))
        self.root.bind('<Left>', lambda e: self.prev_sample())
        self.root.bind('<Right>', lambda e: self.next_sample())
        self.root.bind('<space>', lambda e: self.skip_sample())
        
        # Disable buttons initially
        self.set_buttons_state("disabled")
        
    def set_buttons_state(self, state):
        for btn in self.annotation_btns:
            btn.config(state=state)
        self.prev_btn.config(state=state)
        self.next_btn.config(state=state)
        self.skip_btn.config(state=state)
        self.save_btn.config(state=state)
        self.export_btn.config(state=state)
        
    def load_dataset(self):
        file_path = filedialog.askopenfilename(
            title="Select Sarcasm Dataset",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
            initialdir="../cloud"
        )
        
        if not file_path:
            return
            
        try:
            self.progress_var.set("Loading dataset... (this may take a moment)")
            self.root.update()
            
            # Load only necessary columns
            self.df = pd.read_csv(file_path, usecols=['label', 'comment'])
            
            # Clean data
            self.df = self.df.dropna(subset=['comment'])
            self.df = self.df[self.df['comment'].str.len() > 10]
            self.df = self.df[self.df['comment'].str.len() < 300]
            
            # Shuffle and take a sample for annotation
            self.samples = self.df.sample(min(1000, len(self.df))).reset_index(drop=True)
            self.annotations = [None] * len(self.samples)
            self.current_index = 0
            
            self.progress_var.set(f"Loaded {len(self.samples)} samples for annotation")
            self.progress_bar['maximum'] = len(self.samples)
            
            self.set_buttons_state("normal")
            self.show_current_sample()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load dataset:\n{str(e)}")
            
    def show_current_sample(self):
        if self.samples is None or len(self.samples) == 0:
            return
            
        sample = self.samples.iloc[self.current_index]
        text = sample['comment']
        original = "Sarcastic" if sample['label'] == 1 else "Not Sarcastic"
        
        self.text_display.config(state="normal")
        self.text_display.delete(1.0, tk.END)
        self.text_display.insert(tk.END, text)
        self.text_display.config(state="disabled")
        
        self.original_label_var.set(f"Original label: {original}")
        self.progress_var.set(f"Sample {self.current_index + 1} of {len(self.samples)}")
        self.progress_bar['value'] = self.current_index + 1
        
        # Highlight if already annotated
        if self.annotations[self.current_index] is not None:
            label_id = self.annotations[self.current_index]
            label_name = self.label_map[label_id][0]
            self.progress_var.set(f"Sample {self.current_index + 1} of {len(self.samples)} - Annotated as: {label_name}")
        
        self.update_stats()
        
    def get_class_counts(self):
        """Get current count of annotations per class"""
        counts = {0: 0, 1: 0, 2: 0, 3: 0}
        for a in self.annotations:
            if a is not None:
                counts[a] += 1
        return counts
        
    def annotate(self, label_id):
        if self.samples is None or len(self.samples) == 0:
            return
        
        # Check if class already has 2500 samples
        counts = self.get_class_counts()
        if counts[label_id] >= 2500:
            label_name = self.label_map[label_id][0]
            messagebox.showwarning(
                "Limit Reached", 
                f"{label_name} already has 2500 samples!\n\nChoose a different class or skip this sample."
            )
            return
            
        self.annotations[self.current_index] = label_id
        label_name = self.label_map[label_id][0]
        
        # Flash feedback
        self.progress_var.set(f"✓ Annotated as {label_name}")
        self.root.update()
        
        # Check if all classes are full
        counts = self.get_class_counts()
        if all(c >= 2500 for c in counts.values()):
            messagebox.showinfo(
                "Dataset Complete! 🎉",
                "All classes have reached 2500 samples!\n\n"
                "Click 'Export Dataset' to save your balanced dataset."
            )
            return
        
        # Auto-advance
        self.root.after(300, self.next_sample)
        
    def next_sample(self):
        if self.samples is None or len(self.samples) == 0:
            return
        if self.current_index < len(self.samples) - 1:
            self.current_index += 1
            self.show_current_sample()
        else:
            messagebox.showinfo("Done", "You've reached the last sample!")
            
    def prev_sample(self):
        if self.samples is None or len(self.samples) == 0:
            return
        if self.current_index > 0:
            self.current_index -= 1
            self.show_current_sample()
            
    def skip_sample(self):
        self.next_sample()
        
    def update_stats(self):
        counts = self.get_class_counts()
        self.stats_var.set(
            f"Copium: {counts[0]}/2500 | Sarcastic: {counts[1]}/2500 | Sincere: {counts[2]}/2500 | Neutral: {counts[3]}/2500"
        )
        
    def save_annotations(self):
        if self.samples is None or len(self.samples) == 0:
            messagebox.showwarning("Warning", "No data to save!")
            return
            
        # Filter annotated samples
        annotated = []
        for i, annotation in enumerate(self.annotations):
            if annotation is not None:
                annotated.append({
                    'text': self.samples.iloc[i]['comment'],
                    'label': annotation,
                    'class': ['copium', 'sarcastic', 'sincere', 'neutral'][annotation]
                })
        
        if len(annotated) == 0:
            messagebox.showwarning("Warning", "No annotations to save!")
            return
            
        # Save to file
        file_path = filedialog.asksaveasfilename(
            title="Save Annotations",
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv")],
            initialfile="copium_dataset.csv",
            initialdir="../cloud"
        )
        
        if file_path:
            # Ensure column order matches expected format: text, label, class
            df_out = pd.DataFrame(annotated)[['text', 'label', 'class']]
            df_out.to_csv(file_path, index=False)
            messagebox.showinfo("Saved", f"Saved {len(annotated)} annotations to:\n{file_path}")

    def export_dataset(self):
        """Export a balanced dataset with 2500 samples per class"""
        if self.samples is None or len(self.samples) == 0:
            messagebox.showwarning("Warning", "No data loaded!")
            return
        
        # Count annotated samples per class
        class_samples = {0: [], 1: [], 2: [], 3: []}
        for i, annotation in enumerate(self.annotations):
            if annotation is not None:
                class_samples[annotation].append({
                    'text': self.samples.iloc[i]['comment'],
                    'label': annotation,
                    'class': ['copium', 'sarcastic', 'sincere', 'neutral'][annotation]
                })
        
        # Show summary
        summary = "Annotated samples per class:\n\n"
        for label_id, samples in class_samples.items():
            class_name = self.label_map[label_id][0]
            summary += f"{class_name}: {len(samples)}\n"
        
        total = sum(len(s) for s in class_samples.values())
        summary += f"\nTotal: {total} samples"
        
        if total == 0:
            messagebox.showwarning("Warning", "No annotations to export!")
            return
        
        # Ask for export format
        export_choice = messagebox.askyesnocancel(
            "Export Options",
            f"{summary}\n\nWould you like to export as:\n\n"
            "YES = Balanced dataset (equal samples per class)\n"
            "NO = All annotated samples\n"
            "CANCEL = Cancel export"
        )
        
        if export_choice is None:
            return
        
        if export_choice:  # Balanced export
            min_count = min(len(s) for s in class_samples.values() if len(s) > 0)
            if min_count == 0:
                messagebox.showwarning("Warning", "Need at least 1 sample in each class for balanced export!")
                return
            
            all_samples = []
            for samples in class_samples.values():
                all_samples.extend(samples[:min_count])
            
            random.shuffle(all_samples)
            df_out = pd.DataFrame(all_samples)
            export_name = f"balanced_dataset_{min_count}each.csv"
        else:  # All samples
            all_samples = []
            for samples in class_samples.values():
                all_samples.extend(samples)
            
            random.shuffle(all_samples)
            df_out = pd.DataFrame(all_samples)
            export_name = f"annotated_dataset_{total}total.csv"
        
        # Save file
        file_path = filedialog.asksaveasfilename(
            title="Export Dataset",
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv")],
            initialfile="copium_dataset.csv",
            initialdir="../cloud"
        )
        
        if file_path:
            # Ensure column order matches expected format: text, label, class
            df_out = pd.DataFrame(all_samples)[['text', 'label', 'class']]
            df_out.to_csv(file_path, index=False)
            messagebox.showinfo(
                "Exported", 
                f"Exported {len(df_out)} samples to:\n{file_path}\n\n"
                f"Ready for training with CopiumMeter_Training.ipynb!"
            )


def main():
    root = tk.Tk()
    app = AnnotationTool(root)
    
    # Center window
    root.update_idletasks()
    width = root.winfo_width()
    height = root.winfo_height()
    x = (root.winfo_screenwidth() // 2) - (width // 2)
    y = (root.winfo_screenheight() // 2) - (height // 2)
    root.geometry(f"+{x}+{y}")
    
    root.mainloop()


if __name__ == "__main__":
    main()